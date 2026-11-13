import { test, expect } from "@playwright/test";

async function submitSearch(page, keyword) {
  await page
    .getByRole("textbox", { name: "Từ khóa tìm kiếm", exact: true })
    .fill(keyword);
  await page
    .locator(".hero-search-filters")
    .getByRole("button", { name: "Tìm kiếm", exact: true })
    .click();
}

test("keyword search matches real JSON data across titles, addresses, owners, amenities, and separated tokens", async ({
  page,
}) => {
  await page.goto("/#/");

  // Legacy hardcoded sample overrides must not appear
  await submitSearch(page, "Nhà trọ Minh An");
  await expect(
    page.getByRole("heading", { name: "Không tìm thấy kết quả phù hợp!", exact: true }),
  ).toBeVisible();

  // Exact real house/title keywords (accented & unaccented) show matching rentals and houses, hiding empty roommates
  for (const [query, expectedTitle, expectedHouse] of [
    ["An Phú", "Phòng trọ An Phú gần trung tâm Cần Thơ", "Nhà trọ An Phú"],
    ["an phu", "Phòng trọ An Phú gần trung tâm Cần Thơ", "Nhà trọ An Phú"],
    ["Hoa Sen", "Phòng trọ Hoa Sen gần trung tâm Cần Thơ", "Nhà trọ Hoa Sen"],
    ["Minh Tâm", "Phòng trọ Minh Tâm gần trung tâm Cần Thơ", "Nhà trọ Minh Tâm"],
    ["Thanh Bình", "Phòng trọ Thanh Bình gần trung tâm Cần Thơ", "Nhà trọ Thanh Bình"],
    ["Trúc Xanh", "Phòng trọ Trúc Xanh gần trung tâm Cần Thơ", "Nhà trọ Trúc Xanh"],
  ]) {
    await submitSearch(page, query);
    await expect(page.locator(".group-rentals .room-card")).toHaveCount(1);
    await expect(page.locator(".group-rentals")).toContainText(expectedTitle);
    await expect(page.locator(".group-houses .room-card")).toHaveCount(1);
    await expect(page.locator(".group-houses")).toContainText(expectedHouse);
    await expect(page.locator(".group-roommates")).toHaveCount(0);
  }

  // Non-contiguous multi-word query ("Phòng trọ Cần Thơ") matches rentals & houses
  await submitSearch(page, "Phòng trọ Cần Thơ");
  await expect(page.locator(".home-listings-heading")).toContainText("5 phòng cho thuê");
  await expect(page.locator(".group-rentals .room-card")).toHaveCount(1);

  // Broad query ("Cần Thơ") matches all 3 groups: Phòng cho thuê, Phòng ghép trọ, Nhà trọ (1 card each per page)
  await submitSearch(page, "Cần Thơ");
  await expect(page.locator(".home-listings-heading")).toContainText(
    "5 phòng cho thuê, 4 phòng ghép trọ, 10 nhà trọ",
  );
  await expect(page.locator(".group-rentals .room-card")).toHaveCount(1);
  await expect(page.locator(".group-roommates .room-card")).toHaveCount(1);
  await expect(page.locator(".group-houses .room-card")).toHaveCount(1);
  for (const width of [1280, 768, 375]) {
    await page.setViewportSize({ width, height: 900 });
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
    const box = await page.locator(".group-rentals .room-card").first().boundingBox();
    expect(box.width).toBeLessThanOrEqual(321);
  }
  await page.setViewportSize({ width: 1280, height: 720 });

  // Pagination navigates to remaining cards across groups
  await page.getByRole("navigation", { name: "Phân trang kết quả" }).getByRole("button", { name: "Trang 5", exact: true }).click();
  await expect(page).toHaveURL(/page=5/);
  await expect(page.locator(".group-rentals .room-card")).toHaveCount(1);
  await expect(page.locator(".group-roommates .room-card")).toHaveCount(0);
  await expect(page.locator(".group-roommates")).toContainText("Các kết quả của nhóm này đã hiển thị ở trang trước.");
  await expect(page.locator(".group-houses .room-card")).toHaveCount(1);

  // Punctuation-insensitive address query ("104 đường Nguyễn Văn Linh" vs "104, đường Nguyễn Văn Linh...")
  await submitSearch(page, "104 đường Nguyễn Văn Linh");
  await expect(page.locator(".group-rentals .room-card")).toHaveCount(1);
  await expect(page.locator(".group-rentals")).toContainText(
    "Phòng trọ Minh Tâm gần trung tâm Cần Thơ",
  );
  await expect(page.locator(".group-houses .room-card")).toHaveCount(1);
  await expect(page.locator(".group-houses")).toContainText("Nhà trọ Minh Tâm");
  await expect(page.locator(".group-roommates")).toHaveCount(0);

  // Slash token query ("đường 3/2" and "3 / 2") matches rental, roommate at 100 đường 3/2, and house
  for (const q of ["đường 3/2", "3 / 2"]) {
    await submitSearch(page, q);
    await expect(page.locator(".group-rentals .room-card")).toHaveCount(1);
    await expect(page.locator(".group-rentals")).toContainText(
      "Phòng trọ An Phú gần trung tâm Cần Thơ",
    );
    await expect(page.locator(".group-roommates .room-card")).toHaveCount(1);
    await expect(page.locator(".group-houses .room-card")).toHaveCount(1);
  }

  // Landlord name (owner), amenity, lifestyle, and service fee fields
  await submitSearch(page, "Nguyễn Văn An");
  await expect(page.locator(".group-rentals .room-card")).toHaveCount(1);
  await expect(page.locator(".group-rentals")).toContainText(
    "Phòng trọ An Phú gần trung tâm Cần Thơ",
  );
  await expect(page.locator(".group-houses .room-card")).toHaveCount(1);
  await expect(page.locator(".group-roommates")).toHaveCount(0);

  await submitSearch(page, "Camera 24");
  await expect(page.locator(".group-rentals .room-card")).toHaveCount(1);
  await expect(page.locator(".group-rentals")).toContainText(
    "Phòng trọ Thanh Bình gần trung tâm Cần Thơ",
  );

  await submitSearch(page, "nuôi thú cưng");
  await expect(page.locator(".home-listings-heading")).toContainText("2 phòng cho thuê");
  await expect(page.locator(".group-rentals .room-card")).toHaveCount(1);
  await expect(page.locator(".group-rentals")).toContainText(
    "Phòng trọ Hoa Sen gần trung tâm Cần Thơ",
  );
  await page.getByRole("navigation", { name: "Phân trang kết quả" }).getByRole("button", { name: "Trang 2", exact: true }).click();
  await expect(page.locator(".group-rentals .room-card")).toHaveCount(1);
  await expect(page.locator(".group-rentals")).toContainText(
    "Phòng trọ Thanh Bình gần trung tâm Cần Thơ",
  );

  await submitSearch(page, "yên tĩnh");
  await expect(page.locator(".group-rentals .room-card")).toHaveCount(1);
  await expect(page.locator(".group-rentals")).toContainText(
    "Phòng trọ Trúc Xanh gần trung tâm Cần Thơ",
  );

  await submitSearch(page, "gửi xe");
  await expect(page.locator(".home-listings-heading")).toContainText("4 phòng cho thuê");
  await expect(page.locator(".group-rentals .room-card")).toHaveCount(1);

  // Roommate-only match hides rentals and houses
  await submitSearch(page, "Đọc sách");
  await expect(page.locator(".home-listings-heading")).toContainText("3 phòng ghép trọ");
  await expect(page.locator(".group-roommates .room-card")).toHaveCount(1);
  await expect(page.locator(".group-rentals")).toHaveCount(0);
  await expect(page.locator(".group-houses")).toHaveCount(0);

  // House-only match (Bình Minh house is active while its room post is Ẩn) hides rentals and roommates
  await submitSearch(page, "Bình Minh");
  await expect(page.locator(".group-houses .room-card")).toHaveCount(1);
  await expect(page.locator(".group-houses")).toContainText("Nhà trọ Bình Minh");
  await expect(page.locator(".group-rentals")).toHaveCount(0);
  await expect(page.locator(".group-roommates")).toHaveCount(0);

  // Clicking a house card navigates to /nha-tro/:id and back link returns to search
  await page.locator(".group-houses .room-card-link").first().click();
  await expect(page).toHaveURL(/#\/nha-tro\/BH00000002/);
  await expect(
    page.getByRole("heading", { name: "Nhà trọ Bình Minh", exact: true }),
  ).toBeVisible();
  await page.getByRole("link", { name: "Quay lại tìm trọ", exact: true }).click();
  await expect(page).toHaveURL(/#\/\?search=1&q=B%C3%ACnh\+Minh|q=B%C3%ACnh%20Minh/);

  // Non-matching query shows empty state
  await submitSearch(page, "khongcophongnay");
  await expect(
    page.getByRole("heading", { name: "Không tìm thấy kết quả phù hợp!", exact: true }),
  ).toBeVisible();

  // Invalid punctuation-only query
  await submitSearch(page, "!!!");
  await expect(page.getByRole("alert")).toContainText("Dữ liệu không hợp lệ!");
});

test("stale localStorage cache does not resurrect Minh An or shadow real JSON fields", async ({
  page,
}) => {
  await page.goto("/#/");
  await page.evaluate(() => {
    const key = "findmyroom-demo-v1";
    const data = JSON.parse(localStorage.getItem(key) || "{}");
    data.posts = [
      {
        id: "minh-an",
        kind: "rental",
        title: "Phòng trọ Minh An cũ",
        house: "Nhà trọ Minh An",
        address: "Cần Thơ",
        district: "Ninh Kiều",
        price: 1800000,
        area: 22,
        people: 2,
        status: "Còn phòng",
        amenities: [],
      },
      {
        id: "rp00000001",
        ownerId: "ACC000011",
        kind: "rental",
        title: "Bản lưu cũ thiếu dữ liệu",
        house: "Nhà trọ An Phú",
        address: "100, đường 3/2, quận Ninh Kiều, Cần Thơ",
        district: "Ninh Kiều",
        price: 1500000,
        area: 20,
        people: 2,
        status: "Còn phòng",
        amenities: [],
      },
    ];
    localStorage.setItem(key, JSON.stringify(data));
  });
  await page.reload();

  await submitSearch(page, "Nhà trọ Minh An");
  await expect(
    page.getByRole("heading", { name: "Không tìm thấy kết quả phù hợp!", exact: true }),
  ).toBeVisible();

  await submitSearch(page, "Nguyễn Văn An");
  await expect(page.locator(".group-rentals .room-card")).toHaveCount(1);
  await expect(page.locator(".group-rentals")).toContainText(
    "Phòng trọ An Phú gần trung tâm Cần Thơ",
  );
  await expect(page.locator(".group-houses .room-card")).toHaveCount(1);
});
