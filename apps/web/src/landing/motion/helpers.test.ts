import {
  formatStat,
  groupByLine,
  parseStages,
  parseStat,
  slideOffset,
  wobbleAmplitude,
} from './helpers'

describe('parseStages', () => {
  it('parses_three_probabilities_in_order', () => {
    expect(parseStages('0.031,1,0.42')).toEqual([0.031, 1, 0.42])
  })

  it('tolerates_spaces_around_values', () => {
    expect(parseStages(' 0.1 , 0.5 ,0.9 ')).toEqual([0.1, 0.5, 0.9])
  })

  it.each([
    ['missing attribute', null],
    ['empty', ''],
    ['two values', '0.1,0.2'],
    ['four values', '0.1,0.2,0.3,0.4'],
    ['not a number', '0.1,abc,0.3'],
    ['empty slot', '0.1,,0.3'],
    ['above one', '0.1,1.2,0.3'],
    ['negative', '-0.1,0.2,0.3'],
    ['infinite', '0.1,Infinity,0.3'],
    ['NaN', 'NaN,0.2,0.3'],
  ])('rejects_%s', (_label, raw) => {
    expect(parseStages(raw)).toBeNull()
  })
})

describe('parseStat', () => {
  it('reads_value_decimals_and_suffix', () => {
    expect(parseStat('94.2', '1', '%')).toEqual({ value: 94.2, decimals: 1, suffix: '%' })
  })

  it('defaults_suffix_to_empty_and_decimals_to_zero', () => {
    expect(parseStat('31', null, null)).toEqual({ value: 31, decimals: 0, suffix: '' })
  })

  it.each([
    ['missing value', null, '0'],
    ['non-numeric value', 'x', '0'],
    ['infinite value', 'Infinity', '0'],
    ['fractional decimals', '3', '1.5'],
    ['negative decimals', '3', '-1'],
    ['too many decimals', '3', '9'],
  ])('rejects_%s', (_label, value, decimals) => {
    expect(parseStat(value, decimals, null)).toBeNull()
  })
})

describe('formatStat', () => {
  it('pads_to_the_requested_decimals_and_appends_the_suffix', () => {
    expect(formatStat(0, { value: 94.2, decimals: 1, suffix: '%' })).toBe('0.0%')
    expect(formatStat(47.06, { value: 94.2, decimals: 1, suffix: '%' })).toBe('47.1%')
  })

  it('formats_integers_without_a_point', () => {
    expect(formatStat(30.6, { value: 31, decimals: 0, suffix: '' })).toBe('31')
  })
})

describe('wobbleAmplitude', () => {
  it('is_full_before_any_progress_and_settles_to_zero', () => {
    expect(wobbleAmplitude(0)).toBe(1)
    expect(wobbleAmplitude(1)).toBe(0)
  })

  it('falls_monotonically_with_progress', () => {
    const values = [0, 0.25, 0.5, 0.75, 1].map(wobbleAmplitude)
    values
      .slice(1)
      .forEach((value, i) => expect(value).toBeLessThan(values[i] ?? Number.POSITIVE_INFINITY))
  })

  it('clamps_out_of_range_and_non_finite_progress', () => {
    expect(wobbleAmplitude(-2)).toBe(1)
    expect(wobbleAmplitude(3)).toBe(0)
    expect(wobbleAmplitude(Number.NaN)).toBe(1)
  })
})

describe('slideOffset', () => {
  const holes = [10, 30, 50, 70]

  it('rests_on_the_first_hole_at_the_top_of_the_page', () => {
    expect(slideOffset(0, holes, 10)).toBe(0)
  })

  it('reaches_the_last_hole_at_the_bottom_of_the_page', () => {
    expect(slideOffset(1, holes, 10)).toBe(60)
  })

  it('snaps_to_the_nearest_hole_centre_between_holes', () => {
    // 0.4 of the way is centre 34, nearest hole 30.
    expect(slideOffset(0.4, holes, 10)).toBe(20)
    // 0.6 of the way is centre 46, nearest hole 50.
    expect(slideOffset(0.6, holes, 10)).toBe(40)
  })

  it('measures_from_where_the_dot_rests', () => {
    expect(slideOffset(0, holes, 30)).toBe(-20)
  })

  it('clamps_progress_and_stays_put_without_holes', () => {
    expect(slideOffset(2, holes, 10)).toBe(60)
    expect(slideOffset(-1, holes, 10)).toBe(0)
    expect(slideOffset(0.5, [], 10)).toBe(0)
  })
})

describe('groupByLine', () => {
  it('assigns_one_line_index_per_distinct_top_in_reading_order', () => {
    expect(groupByLine([0, 0, 0, 24, 24, 48])).toEqual([0, 0, 0, 1, 1, 2])
  })

  it('treats_sub_pixel_jitter_as_the_same_line', () => {
    expect(groupByLine([10, 10.4, 11, 34])).toEqual([0, 0, 0, 1])
  })

  it('returns_an_empty_list_for_no_words', () => {
    expect(groupByLine([])).toEqual([])
  })
})
