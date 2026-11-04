import { amenities, districts } from './data'

// School names follow their official websites. Room associations below are demo data,
// not measured distances to a campus.
export const schools = [
  { id: 'ctu', name: 'Đại học Cần Thơ', shortName: 'ĐH Cần Thơ', type: 'Đại học', source: 'https://www.ctu.edu.vn/' },
  { id: 'ctump', name: 'Đại học Y Dược Cần Thơ', shortName: 'ĐH Y Dược Cần Thơ', type: 'Đại học', source: 'https://www.ctump.edu.vn/' },
  { id: 'ctuet', name: 'Đại học Kỹ thuật - Công nghệ Cần Thơ', shortName: 'ĐH Kỹ thuật - Công nghệ', type: 'Đại học', source: 'https://www.ctuet.edu.vn/' },
  { id: 'nctu', name: 'Đại học Nam Cần Thơ', shortName: 'ĐH Nam Cần Thơ', type: 'Đại học', source: 'https://nctu.edu.vn/' },
  { id: 'tdu', name: 'Đại học Tây Đô', shortName: 'ĐH Tây Đô', type: 'Đại học', source: 'https://tdu.edu.vn/' },
  { id: 'ctec', name: 'Cao đẳng Kinh tế - Kỹ thuật Cần Thơ', shortName: 'CĐ Kinh tế - Kỹ thuật', type: 'Cao đẳng', source: 'https://www.ctec.edu.vn/ctec/' },
  { id: 'ctvc', name: 'Cao đẳng Nghề Cần Thơ', shortName: 'CĐ Nghề Cần Thơ', type: 'Cao đẳng', source: 'https://ctvc.edu.vn/' },
]

export const priceRanges = [
  { id: 'under-1m', label: 'Dưới 1 triệu', min: 0, max: 1_000_000 },
  { id: '1m-1_5m', label: '1 – 1,5 triệu', min: 1_000_000, max: 1_500_000 },
  { id: '1_5m-2m', label: '1,5 – 2 triệu', min: 1_500_000, max: 2_000_000 },
  { id: '2m-2_5m', label: '2 – 2,5 triệu', min: 2_000_000, max: 2_500_000 },
  { id: '2_5m-3m', label: '2,5 – 3 triệu', min: 2_500_000, max: 3_000_000 },
  { id: '3m-3_5m', label: '3 – 3,5 triệu', min: 3_000_000, max: 3_500_000 },
  { id: '3_5m-4m', label: '3,5 – 4 triệu', min: 3_500_000, max: 4_000_000 },
  { id: '4m-5m', label: '4 – 5 triệu', min: 4_000_000, max: 5_000_000 },
  { id: '5m-7m', label: '5 – 7 triệu', min: 5_000_000, max: 7_000_000 },
  { id: 'from-7m', label: 'Từ 7 triệu', min: 7_000_000, max: Infinity },
]

export const emptyFilters = () => ({ school: '', district: '', prices: [], amenities: [] })
const values = value => (Array.isArray(value) ? value : value ? [value] : []).filter(value => typeof value === 'string')

export function filtersFromQuery(query) {
  const school = schools.find(school => school.id === values(query.school)[0])?.id || ''
  let prices = values(query.prices).filter(id => priceRanges.some(range => range.id === id)).slice(0, 1)
  // Keep older links with a maximum price usable.
  if (!prices.length && Number(query.price) > 0) prices = priceRanges.filter(range => range.max <= Number(query.price)).map(range => range.id)
  return {
    school,
    district: !school && districts.includes(values(query.district)[0]) ? values(query.district)[0] : '',
    prices: [...new Set(prices)],
    amenities: [...new Set(values(query.amenity).filter(value => amenities.includes(value)))],
  }
}

export function queryFromFilters(filters, keyword = '') {
  return {
    ...(keyword.trim() ? { q: keyword.trim() } : {}),
    ...(filters.school ? { school: filters.school } : {}),
    ...(!filters.school && filters.district ? { district: filters.district } : {}),
    ...(filters.prices.length ? { prices: filters.prices.slice(0, 1) } : {}),
    ...(filters.amenities.length ? { amenity: [...filters.amenities] } : {}),
  }
}

export function matchesFilters(room, filters) {
  return (!filters.school || room.schoolIds?.includes(filters.school)) &&
    (!filters.district || room.district === filters.district) &&
    (!filters.prices.length || priceRanges.some(range => filters.prices.includes(range.id) && room.price >= range.min && room.price < range.max)) &&
    filters.amenities.every(amenity => room.amenities.includes(amenity))
}

export function searchQueryError(query) {
  for (const key of ['q', 'school', 'district', 'price', 'page', 'search']) {
    if (Array.isArray(query[key])) return 'Mỗi từ khóa hoặc địa điểm chỉ được có một giá trị.'
  }
  const keyword = typeof query.q === 'string' ? query.q.trim() : ''
  if (keyword.length > 120 || /[\u0000-\u001f\u007f]/.test(keyword) || (keyword && !/[\p{L}\p{N}]/u.test(keyword))) return 'Nhập từ khóa có chữ hoặc số, tối đa 120 ký tự.'
  if (query.school && !schools.some(school => school.id === query.school)) return 'Vui lòng chọn trường học trong danh sách.'
  if (query.district && !districts.includes(query.district)) return 'Vui lòng chọn khu vực trong danh sách.'
  if (query.school && query.district) return 'Chọn tìm theo trường học hoặc theo khu vực.'
  if (values(query.prices).some(id => !priceRanges.some(range => range.id === id))) return 'Khoảng giá đã chọn không hợp lệ.'
  if (query.price && (!Number.isFinite(Number(query.price)) || Number(query.price) <= 0)) return 'Khoảng giá phải lớn hơn 0.'
  if (values(query.amenity).some(value => !amenities.includes(value))) return 'Vui lòng chọn tiện ích trong danh sách.'
  if (query.page && (!/^\d+$/.test(query.page) || !Number.isSafeInteger(Number(query.page)) || Number(query.page) < 1)) return 'Số trang kết quả không hợp lệ.'
  return ''
}
