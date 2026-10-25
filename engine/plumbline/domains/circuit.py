"""Circuit domain: the breadboard netlist, a nodal solver with a piecewise-linear LED, and
the 33-hypothesis fault catalog.

The netlist is the 2026-10-25 reconstruction (ARCHITECTURE 5.1) that reproduces the six
reference voltages. GND is the battery negative rail and is not a site; sites are rows 1-6
(indices 0-5). Row 1 is tied to the battery positive terminal, so its voltage is fixed and the
remaining five rows are solved by nodal analysis.
"""

from __future__ import annotations

from collections.abc import Sequence
from dataclasses import dataclass, replace
from functools import cached_property

import numpy as np

from plumbline import phrases
from plumbline.config import CLASS_TOLERANCE_VOLTS, SIGMA_VOLTS
from plumbline.model import FloatArray, Hypothesis, ReadingSpec, Site

GND = -1
N_ROWS = 6
BATTERY_VOLTS = 9.0
BATTERY_LOW_VOLTS = 7.2
OPEN_OHMS = 1e9
SHORT_OHMS = 1e-3
TEN_X = 10.0
LED_VF0_VOLTS = 2.0
LED_RS_OHMS = 20.0
LED_SHORT_SIEMENS = 1e6
LED_MAX_ITERATIONS = 8
READING_MIN_VOLTS = -1.0
READING_MAX_VOLTS = 12.0
READING_DECIMALS = 3


@dataclass(frozen=True)
class Resistor:
    name: str
    node_a: int
    node_b: int
    ohms: float


@dataclass(frozen=True)
class LedModel:
    """Piecewise-linear LED: open below ``vf0``, a ``vf0`` source in series with ``rs`` above.

    ``state`` is ``normal``, ``open``, ``short`` or ``reversed`` (anode and cathode swapped).
    """

    anode: int
    cathode: int
    vf0: float = LED_VF0_VOLTS
    rs: float = LED_RS_OHMS
    state: str = "normal"


@dataclass(frozen=True)
class Netlist:
    battery_volts: float
    resistors: tuple[Resistor, ...]
    led: LedModel


DEFAULT_NETLIST = Netlist(
    battery_volts=BATTERY_VOLTS,
    resistors=(
        Resistor("R1", 0, 1, 1000.0),
        Resistor("R2", 1, 2, 2200.0),
        Resistor("R3", 2, GND, 2200.0),
        Resistor("R4", 2, 5, 4700.0),
        Resistor("R5", 5, GND, 4700.0),
        Resistor("R6", 1, 3, 330.0),
        Resistor("R7", 4, GND, 100.0),
    ),
    led=LedModel(anode=3, cathode=4),
)


def _stamp_conductance(g_matrix: FloatArray, a: int, b: int, siemens: float) -> None:
    for node in (a, b):
        if node != GND:
            g_matrix[node, node] += siemens
    if a != GND and b != GND:
        g_matrix[a, b] -= siemens
        g_matrix[b, a] -= siemens


def _solve_linear(netlist: Netlist, led_conducting: bool) -> FloatArray:
    g_matrix = np.zeros((N_ROWS, N_ROWS))
    rhs = np.zeros(N_ROWS)
    for resistor in netlist.resistors:
        _stamp_conductance(g_matrix, resistor.node_a, resistor.node_b, 1.0 / resistor.ohms)
    led = netlist.led
    anode, cathode = (
        (led.cathode, led.anode) if led.state == "reversed" else (led.anode, led.cathode)
    )
    if led.state == "short":
        _stamp_conductance(g_matrix, anode, cathode, LED_SHORT_SIEMENS)
    elif led.state != "open" and led_conducting:
        g_led = 1.0 / led.rs
        _stamp_conductance(g_matrix, anode, cathode, g_led)
        rhs[anode] += g_led * led.vf0
        rhs[cathode] -= g_led * led.vf0
    volts = np.empty(N_ROWS)
    volts[0] = netlist.battery_volts
    reduced_rhs = rhs[1:] - g_matrix[1:, 0] * netlist.battery_volts
    volts[1:] = np.linalg.solve(g_matrix[1:, 1:], reduced_rhs)
    return volts


def solve_nodes(netlist: Netlist) -> FloatArray:
    """Node voltages for rows 1-6, iterating the LED between its two linear regions."""
    led = netlist.led
    anode, cathode = (
        (led.cathode, led.anode) if led.state == "reversed" else (led.anode, led.cathode)
    )
    conducting = True
    for _ in range(LED_MAX_ITERATIONS):
        volts = _solve_linear(netlist, conducting)
        forward = volts[anode] - volts[cathode]
        should_conduct = forward > led.vf0
        if should_conduct == conducting:
            if not np.isfinite(volts).all():
                raise ArithmeticError("nodal solve produced non-finite voltages")
            return volts
        conducting = should_conduct
    raise RuntimeError("LED region iteration did not converge")


@dataclass(frozen=True)
class CatalogEntry:
    hypothesis: Hypothesis
    netlist: Netlist


RESISTOR_FAULTS: tuple[tuple[str, str], ...] = (
    ("open", "is open"),
    ("short", "is shorted"),
    ("10x_high", "is ten times too large"),
    ("10x_low", "is ten times too small"),
)


def _faulted_ohms(nominal: float, kind: str) -> float:
    return {
        "open": OPEN_OHMS,
        "short": SHORT_OHMS,
        "10x_high": nominal * TEN_X,
        "10x_low": nominal / TEN_X,
    }[kind]


def _node_name(node: int) -> str:
    return "ground" if node == GND else f"row {node + 1}"


def _resistor_entries(netlist: Netlist) -> list[CatalogEntry]:
    entries: list[CatalogEntry] = []
    for index, resistor in enumerate(netlist.resistors):
        for kind, phrase in RESISTOR_FAULTS:
            ohms = _faulted_ohms(resistor.ohms, kind)
            resistors = list(netlist.resistors)
            resistors[index] = replace(resistor, ohms=ohms)
            label = f"{resistor.name} {phrase}"
            description = (
                f"{resistor.name} ({resistor.ohms:g} ohm between {_node_name(resistor.node_a)} "
                f"and {_node_name(resistor.node_b)}) modelled as {ohms:g} ohm."
            )
            hypothesis = Hypothesis(f"{resistor.name}_{kind}", label, label, description)
            entries.append(CatalogEntry(hypothesis, replace(netlist, resistors=tuple(resistors))))
    return entries


def build_catalog(netlist: Netlist = DEFAULT_NETLIST) -> tuple[CatalogEntry, ...]:
    """nominal, R1..R7 x {open, short, 10x_high, 10x_low}, LED faults, battery_low: 33 entries."""
    led_faults = (
        ("LED_open", "LED is open", "open", "The LED conducts no current."),
        ("LED_short", "LED is shorted", "short", f"The LED is a {LED_SHORT_SIEMENS:g} S short."),
        (
            "LED_reversed",
            "LED is installed backwards",
            "reversed",
            "Anode and cathode swapped; reverse biased, so it conducts nothing.",
        ),
    )
    nominal = Hypothesis("nominal", "No fault", "No fault", "Every part at its nominal value.")
    entries = [CatalogEntry(nominal, netlist), *_resistor_entries(netlist)]
    for hypothesis_id, label, state, description in led_faults:
        led = replace(netlist.led, state=state)
        entries.append(
            CatalogEntry(
                Hypothesis(hypothesis_id, label, label, description), replace(netlist, led=led)
            )
        )
    battery = Hypothesis(
        "battery_low",
        "Battery is weak",
        "Battery is weak",
        f"The battery delivers {BATTERY_LOW_VOLTS:g} V instead of {netlist.battery_volts:g} V.",
    )
    entries.append(CatalogEntry(battery, replace(netlist, battery_volts=BATTERY_LOW_VOLTS)))
    return tuple(entries)


class CircuitModel:
    """The breadboard circuit as an ``InstrumentModel``. Exact physics, not simulated data."""

    domain = "circuit"
    display_name = "Breadboard circuit"
    simulated = False
    default_sigma = SIGMA_VOLTS
    default_class_tolerance = CLASS_TOLERANCE_VOLTS
    reading = ReadingSpec("V", READING_MIN_VOLTS, READING_MAX_VOLTS, READING_DECIMALS)

    def __init__(self, netlist: Netlist = DEFAULT_NETLIST) -> None:
        self._catalog = build_catalog(netlist)
        self.hypotheses: tuple[Hypothesis, ...] = tuple(e.hypothesis for e in self._catalog)
        self.hypothesis_ids: tuple[str, ...] = tuple(h.id for h in self.hypotheses)
        self.sites: tuple[Site, ...] = tuple(
            Site(row, f"row {row + 1}", f"row {row + 1}") for row in range(N_ROWS)
        )
        self._index = {hypothesis_id: i for i, hypothesis_id in enumerate(self.hypothesis_ids)}

    @cached_property
    def _expected(self) -> FloatArray:
        volts = np.array([solve_nodes(entry.netlist) for entry in self._catalog])
        volts.setflags(write=False)
        return volts

    def expected_readings(self) -> FloatArray:
        return self._expected

    def expected_reading(self, hypothesis: int, site: int) -> float:
        return float(self._expected[hypothesis, site])

    def hypothesis_index(self, hypothesis_id: str) -> int:
        return self._index[hypothesis_id]

    def instruction_phrase(self, site: int) -> str:
        return phrases.instruction(self.sites[site].label, "Probe")

    def warning_phrase(self, told_site: int, likely_site: int) -> str:
        return phrases.warning(self.sites[told_site].label, self.sites[likely_site].label)

    def diagnosis_phrase(self, hypothesis: int, confidence: float) -> str:
        return phrases.diagnosis(self.hypotheses[hypothesis].label, confidence)

    def unresolved_phrase(self, class_ids: Sequence[str], reason: str) -> str:
        labels = [self.hypotheses[self._index[i]].label for i in class_ids]
        return phrases.unresolved(labels, reason, "voltage")

    def misfit_phrase(self, told_site: int) -> str:
        return (
            "That reading does not match this circuit at any nearby row. Check that the probe "
            f"is touching metal, then measure {self.sites[told_site].label} again."
        )
