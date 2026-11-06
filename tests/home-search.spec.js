import { test, expect } from "@playwright/test";

async function submit(page, keyword = "") {
  await page
    .getByRole("textbox", { name: "Từ khóa tìm kiếm", exact: true })
    .fill(keyword);
  await page
    .locator(".hero-search-filters")
    .getByRole("button", { name: "Tìm kiếm", exact: true })
    .click();
}

async function addAvailableRooms(page) {
  await page.evaluate(() => {
    const key = "findmyroom-demo-v1";
    const data = JSON.parse(localStorage.getItem(key));
    for (let index = 0; index < 5; index++)
      data.posts.push({
        ...data.posts[0],
        id: "available-test-" + index,
        title: "Phòng kiểm thử " + index,
        price: 3000000 + index * 100000,
        kind: "rental",
        status: "Còn phòng",
      });
    localStorage.setItem(key, JSON.stringify(data));
  });
  await page.reload();
}

test("districts scroll horizontally on desktop and mobile", async ({ page }) => {
  await page.emulateMedia({ reducedMotion: "reduce" });
  for (const width of [1280, 375]) {
    await page.setViewportSize({ width, height: 800 });
    await page.goto("/#/");
    const track = page.getByRole("region", { name: "Các khu vực tìm trọ" });
    await expect(track.locator(".location-card")).toHaveCount(9);
    await page.getByRole("button", { name: "Địa điểm tiếp theo" }).click();
    await expect
      .poll(() => track.evaluate((element) => element.scrollLeft))
      .toBeGreaterThan(0);
    await track.locator(".location-card").last().click();
    await expect(page).toHaveURL(/district=/);
  }
});

test("home shows only available rooms and respects edited sample status", async ({
  page,
}) => {
  await page.goto("/#/");
  await page.evaluate(() => {
    const key = "findmyroom-demo-v1";
    const data = JSON.parse(localStorage.getItem(key));
    data.posts[0].status = "Hết phòng";
    data.posts.push({
      ...data.posts[0],
      id: "new-available",
      title: "Phòng mới còn trống",
      status: "Còn phòng",
    });
    data.posts.push({
      ...data.posts[0],
      id: "hidden-rental",
      title: "Phòng đã ẩn",
      status: "Ẩn",
    });
    localStorage.setItem(key, JSON.stringify(data));
  });
  await page.reload();
  await expect(page.locator(".featured .room-card .badge")).not.toHaveCount(0);
  for (const section of [page.locator(".featured"), page.locator(".group-rentals")]) {
    await expect(section.locator(".room-card .badge")).toHaveText(
      Array(5).fill("Còn phòng"),
    );
    await expect(section).not.toContainText("Phòng có gác, gần Đại học Cần Thơ");
    await expect(section).not.toContainText("Phòng đã ẩn");
    await expect(section).toContainText("Phòng mới còn trống");
  }
});

test("student home keeps its landing content and searches only rental rooms on the same route", async ({
  page,
  context,
}) => {
  const response = await context.request.post("/api/auth/login", {
    data: { email: "sinhvien@example.com", password: "demopass123" },
  });
  expect(response.ok()).toBeTruthy();
  await page.goto("/#/");
  await expect(page.locator(".locations")).toBeVisible();
  await expect(page.locator(".featured")).toBeVisible();
  await expect(page.locator(".group-rentals .room-card")).toHaveCount(8);
  await expect(page.locator(".currency-icon")).toHaveText("$");
  await expect(
    page.locator(".group-rentals .room-card").first().locator(".price"),
  ).toContainText("1.800.000 đ");
  await expect(page.locator(".group-roommates")).toHaveCount(0);
  await expect(page.locator(".group-houses")).toHaveCount(0);
  await expect(
    page.locator("header").getByRole("link", { name: "Tìm trọ", exact: true }),
  ).toHaveCount(0);
  await submit(page, "Cần Thơ");
  await expect(page).toHaveURL(/#\/\?search=1/);
  expect(page.url()).not.toContain("/tim-tro");
  await expect(page.locator(".hero-art")).toBeVisible();
  await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
  await expect(page.locator(".locations")).toHaveCount(0);
  await expect(page.locator(".featured")).toHaveCount(0);
  await expect(page.locator(".group-rentals .room-card")).toHaveCount(8);
  await expect(page.locator(".group-roommates")).toHaveCount(0);
  await expect(page.locator(".group-houses")).toHaveCount(0);
  await expect(page.locator(".home-listings-heading")).toContainText("phòng cho thuê");
  const searchUrl = page.url();
  await page.reload();
  await expect(
    page.getByRole("textbox", { name: "Từ khóa tìm kiếm", exact: true }),
  ).toHaveValue("Cần Thơ");
  await expect(page.locator(".group-rentals .room-card")).toHaveCount(8);
  await expect(page.locator(".group-roommates")).toHaveCount(0);
  await expect(page.locator(".group-houses")).toHaveCount(0);
  await page
    .locator(".group-rentals .room-card")
    .first()
    .getByRole("link", { name: /Xem chi tiết/ })
    .click();
  await expect(page).toHaveURL(/phong\/minh-an/);
  await page.getByRole("link", { name: "Quay lại tìm trọ", exact: true }).click();
  await expect(page).toHaveURL(searchUrl);
  await page.getByRole("link", { name: "Về trang chủ", exact: true }).click();
  await expect(page.locator(".featured")).toBeVisible();
  await expect(page.locator(".group-rentals .room-card")).toHaveCount(8);
  await expect(page.locator(".group-roommates")).toHaveCount(0);
  await expect(page.locator(".group-houses")).toHaveCount(0);
});

test("no matches and invalid searches have separate recoverable states on home", async ({
  page,
}) => {
  await page.goto("/#/");
  await submit(page, "Lam Thư");
  await expect(
    page.getByRole("heading", { name: "Không tìm thấy kết quả phù hợp!", exact: true }),
  ).toBeVisible();
  await submit(page, "khongcophongnay");
  await expect(
    page.getByRole("heading", { name: "Không tìm thấy kết quả phù hợp!", exact: true }),
  ).toBeVisible();
  await expect(page.locator(".home-listing-group")).toHaveCount(0);
  expect(page.url()).not.toContain("/tim-tro");
  await submit(page, "!!!");
  await expect(page.getByRole("alert")).toContainText("Dữ liệu không hợp lệ!");
  await expect(
    page.getByRole("textbox", { name: "Từ khóa tìm kiếm", exact: true }),
  ).toHaveAttribute("aria-invalid", "true");
  await page.getByRole("button", { name: "Nhập lại tìm kiếm", exact: true }).click();
  await expect(page.locator(".group-rentals .room-card")).toHaveCount(8);
  await page.goto("/#/?search=1&school=invalid-school");
  await expect(page.getByRole("alert")).toContainText("Dữ liệu không hợp lệ!");
  await expect(page.locator(".home-listing-group")).toHaveCount(0);
});

test("pagination preserves the search and shows only published listings", async ({
  page,
}) => {
  await page.goto("/#/");
  await page.evaluate(() => {
    const key = "findmyroom-demo-v1";
    const data = JSON.parse(localStorage.getItem(key));
    const template = data.posts[0];
    for (let index = 0; index < 9; index++)
      data.posts.push({
        ...template,
        id: "pagination-" + index,
        title: "Phòng thử phân trang " + index,
        house: "Nhà trọ kiểm thử " + index,
        kind: "rental",
        status: "Đang hiển thị",
      });
    data.posts.push({
      ...template,
      id: "pending-post",
      title: "Phòng thử phân trang chưa duyệt",
      kind: "rental",
      status: "Chờ duyệt",
    });
    localStorage.setItem(key, JSON.stringify(data));
  });
  await page.reload();
  await submit(page, "Phòng thử phân trang");
  await expect(page.locator(".group-rentals .room-card")).toHaveCount(8);
  await page
    .getByRole("navigation", { name: "Phân trang kết quả", exact: true })
    .getByRole("button", { name: "Trang 2", exact: true })
    .click();
  await expect(page).toHaveURL(/page=2/);
  await expect(page.locator(".group-rentals .room-card")).toHaveCount(1);
  await expect(page.locator(".group-roommates")).toHaveCount(0);
  await expect(page.locator(".group-houses")).toHaveCount(0);
  await expect(page.locator(".group-rentals")).toContainText("Phòng thử phân trang 8");
  await expect(page.locator(".group-rentals")).not.toContainText("chưa duyệt");
  await page.reload();
  await expect(
    page.getByRole("textbox", { name: "Từ khóa tìm kiếm", exact: true }),
  ).toHaveValue("Phòng thử phân trang");
  await expect(
    page.getByRole("button", { name: "Trang 2", exact: true }),
  ).toHaveAttribute("aria-current", "page");
  await page.getByRole("button", { name: "Trang trước", exact: true }).click();
  await expect(page.locator(".group-rentals .room-card")).toHaveCount(8);
});

test("price sorting applies before pagination and survives navigation", async ({
  page,
}) => {
  await page.goto("/#/");
  await addAvailableRooms(page);
  await page.setViewportSize({ width: 375, height: 800 });
  const ascending = page.getByRole("button", { name: "Giá tăng dần" });
  const descendingButton = page.getByRole("button", { name: "Giá giảm dần" });
  const prices = async () =>
    (await page.locator(".group-rentals .price").allTextContents()).map((text) =>
      Number(text.split("đ")[0].replace(/\D/g, "")),
    );
  await ascending.scrollIntoViewIfNeeded();
  const scrollBefore = await page.evaluate(() => window.scrollY);
  await ascending.click();
  await expect(ascending).toHaveAttribute("aria-pressed", "true");
  expect(
    Math.abs((await page.evaluate(() => window.scrollY)) - scrollBefore),
  ).toBeLessThan(10);
  const firstPage = await prices();
  expect(firstPage).toEqual([...firstPage].sort((a, b) => a - b));
  await page.setViewportSize({ width: 1280, height: 800 });
  await page.getByRole("button", { name: "Trang 2", exact: true }).click();
  const secondPage = await prices();
  expect(secondPage[0]).toBeGreaterThanOrEqual(firstPage.at(-1));
  await page.reload();
  await expect(ascending).toHaveAttribute("aria-pressed", "true");
  await descendingButton.click();
  await expect(
    page.getByRole("button", { name: "Trang 1", exact: true }),
  ).toHaveAttribute("aria-current", "page");
  const descending = await prices();
  expect(descending).toEqual([...descending].sort((a, b) => b - a));
  expect(descending[0]).toBeGreaterThanOrEqual(secondPage.at(-1));
  await descendingButton.click();
  await expect(descendingButton).toHaveAttribute("aria-pressed", "false");
});

test("mobile listings are centered and load more on scroll", async ({ page }) => {
  await page.setViewportSize({ width: 375, height: 800 });
  await page.goto("/#/");
  await addAvailableRooms(page);
  const cards = page.locator(".group-rentals .room-card");
  await expect(cards).toHaveCount(8);
  await expect(page.getByRole("navigation", { name: "Phân trang kết quả" })).toHaveCount(
    0,
  );
  const first = await cards.nth(0).boundingBox();
  const second = await cards.nth(1).boundingBox();
  expect(Math.abs(first.x - second.x)).toBeLessThan(2);
  expect(second.y).toBeGreaterThan(first.y + first.height - 1);
  await page.getByRole("button", { name: "Xem thêm phòng trọ" }).scrollIntoViewIfNeeded();
  await expect(cards).toHaveCount(10);
});

test("old search links resolve to home and grouped results fit mobile and desktop", async ({
  page,
}) => {
  await page.goto("/#/tim-tro?district=Ninh%20Ki%E1%BB%81u");
  await expect(page).toHaveURL(/#\/\?.*search=1/);
  expect(page.url()).not.toContain("/tim-tro");
  await expect(page.locator(".group-rentals .room-card")).toHaveCount(1);
  for (const width of [375, 768, 1024, 1440]) {
    await page.setViewportSize({ width, height: 900 });
    expect(
      await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth),
      `${width}: horizontal overflow`,
    ).toBeTruthy();
    await expect(page.locator(".group-rentals .room-card").first()).toBeVisible();
  }
  await page.setViewportSize({ width: 375, height: 900 });
  const navigation = page.getByRole("navigation", {
    name: "Điều hướng điện thoại",
    exact: true,
  });
  await expect(navigation.getByRole("link")).toHaveCount(3);
  await expect(
    navigation.getByRole("link", { name: "Tìm trọ", exact: true }),
  ).toHaveCount(0);
});
