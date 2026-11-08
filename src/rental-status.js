export const rentalStatuses = ['Còn phòng', 'Hết phòng', 'Ẩn']

export function rentalStatus(post) {
  if (rentalStatuses.includes(post.status)) return post.status
  const legacy = { active: 'Còn phòng', complete: 'Hết phòng', hidden: 'Ẩn', expired: 'Ẩn', 'Đang hiển thị': 'Còn phòng', 'Đang tìm bạn': 'Còn phòng', 'Đã tìm đủ': 'Hết phòng' }
  return legacy[post.status] || (post.count != null && post.count !== '' && Number(post.count) === 0 ? 'Hết phòng' : 'Còn phòng')
}
