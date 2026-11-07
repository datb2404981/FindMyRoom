import { test, expect } from "@playwright/test";
async function login(page, role = "student", redirect = "/ho-so") {
  await page.goto("/#/dang-nhap?redirect=" + encodeURIComponent(redirect));
  await page
    .getByLabel("Email *", { exact: true })
    .fill(role === "landlord" ? "chutro@example.com" : "sinhvien@example.com");
  await page.getByLabel("Mật khẩu *", { exact: true }).fill("demopass123");
  await page
    .locator("form")
    .getByRole("button", { name: "Đăng nhập", exact: true })
    .click();
  await expect(page).not.toHaveURL(/dang-nhap/);
}

for (const kind of ["rental", "roommate"]) {
  test(`other service fees accept text and spaces throughout ${kind} posting`, async ({
    page,
  }) => {
    await login(page, kind === "rental" ? "landlord" : "student", `/dang-bai/${kind}`);
    const fee = page.getByLabel(kind === "rental" ? "Chi phí khác" : "Phí khác", {
      exact: true,
    });
    await fee.fill("Rác");
    await fee.press("End");
    await fee.press("Space");
    await expect(fee).toHaveValue("Rác ");
    await fee.pressSequentially("20.000; xe 50.000");
    const value = "Rác 20.000; xe 50.000";
    await expect(fee).toHaveValue(value);
    await page.reload();
    await expect(fee).toHaveValue(value);
    await page
      .getByLabel("Tiêu đề bài đăng *", { exact: true })
      .fill("Phòng kiểm tra chi phí khác");
    if (kind === "rental")
      await page.getByLabel("Chọn nhà trọ *", { exact: true }).selectOption("minh-an");
    else
      await page
        .getByLabel("Ngày có thể chuyển vào *", { exact: true })
        .fill("2027-12-10");
    for (const input of await page.getByRole("spinbutton").all()) await input.fill("100");
    await page.getByRole("button", { name: "Tiếp theo", exact: true }).click();
    await expect(
      page.getByRole("heading", { name: "Vị trí & Địa lý", exact: true }),
    ).toBeVisible();
    await page.getByRole("button", { name: "Trước", exact: true }).click();
    await expect(fee).toHaveValue(value);
    await page.getByRole("button", { name: "Tiếp theo", exact: true }).click();
    await page.getByLabel("Phường / Xã *").selectOption("Xuân Khánh");
    await page.getByLabel("Tên đường / số nhà *").fill("123 đường 3/2");
    await page.getByRole("button", { name: "Tiếp theo", exact: true }).click();
    const png = Buffer.from(
      "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+kvKkAAAAASUVORK5CYII=",
      "base64",
    );
    await page
      .getByLabel("Tải hình ảnh chỗ ở")
      .setInputFiles(
        [1, 2, 3].map((i) => ({
          name: `room${i}.png`,
          mimeType: "image/png",
          buffer: png,
        })),
      );
    await page.getByRole("button", { name: "Tiếp theo", exact: true }).click();
    if (kind === "rental")
      await page.getByRole("button", { name: "Tiếp theo", exact: true }).click();
    await page.getByRole("button", { name: "Đăng bài", exact: true }).click();
    await expect(
      page.getByRole("heading", { name: "Bài đăng đã được lưu" }),
    ).toBeVisible();
    await page.goto("/#/quan-ly/bai-dang");
    if (kind === "rental") {
      await page
        .locator(".manage-post")
        .first()
        .getByRole("link", { name: "Phòng kiểm tra chi phí khác", exact: true })
        .click();
      await expect(page.locator(".remaining-rooms")).toContainText("100 phòng");
      await expect(page.locator(".internet-cost")).toContainText("100 đ / tháng");
      await page
        .getByRole("link", { name: "Quay lại quản lý bài đăng", exact: true })
        .click();
    }
    await page
      .locator(".manage-post")
      .first()
      .getByRole(kind === "rental" ? "button" : "link", { name: "Chỉnh sửa" })
      .click();
    await expect(fee).toHaveValue(value);
  });
}
test("matching is available to students and guests but not landlords", async ({
  page,
}) => {
  await page.goto("/#/ghep-tro");
  await expect(
    page.getByRole("button", { name: "Bắt đầu ghép trọ", exact: true }),
  ).toBeVisible();
  await login(page, "landlord", "/ghep-tro");
  await expect(page).toHaveURL(/quan-ly\/bai-dang/);
  await expect(page.locator('a[href*="/ghep-tro"]')).toHaveCount(0);
  await page.goto("/#/ghep-tro?guide=1");
  await expect(page).toHaveURL(/quan-ly\/bai-dang/);
  await page.reload();
  await expect(
    page.locator("header").getByRole("link", { name: "Ghép trọ", exact: true }),
  ).toHaveCount(0);
  await expect(
    page.locator("header").getByRole("link", { name: "Tìm trọ", exact: true }),
  ).toHaveCount(0);
  for (const path of ["/", "/?search=1", "/tim-tro?district=Ninh%20Ki%E1%BB%81u"]) {
    await page.goto("/#" + path);
    await expect(page).toHaveURL(/quan-ly\/bai-dang/);
    await expect(
      page.getByRole("textbox", { name: "Từ khóa tìm kiếm", exact: true }),
    ).toHaveCount(0);
  }
  await page.setViewportSize({ width: 390, height: 844 });
  await page.getByRole("button", { name: "Mở menu", exact: true }).click();
  await expect(
    page
      .getByRole("navigation", { name: "Điều hướng menu điện thoại", exact: true })
      .getByRole("link", { name: "Ghép trọ", exact: true }),
  ).toHaveCount(0);
  await expect(
    page.locator(".bottom-nav").getByRole("link", { name: "Ghép trọ", exact: true }),
  ).toHaveCount(0);
  await expect(
    page.locator(".bottom-nav").getByRole("link", { name: "Tìm trọ", exact: true }),
  ).toHaveCount(0);
  await expect(
    page.locator(".bottom-nav").getByRole("link", { name: "Nhà trọ", exact: true }),
  ).toBeVisible();
  await page
    .getByRole("navigation", { name: "Điều hướng menu điện thoại", exact: true })
    .getByRole("button", { name: "Đăng xuất", exact: true })
    .click();
  await login(page, "student", "/ghep-tro");
  await expect(page).toHaveURL(/ghep-tro/);
  await expect(
    page.getByRole("button", { name: "Bắt đầu ghép trọ", exact: true }),
  ).toBeVisible();
});

test("managed posts open their own latest details while edit and delete stay separate", async ({
  page,
}) => {
  await login(page, "landlord", "/quan-ly/bai-dang");
  const postButton = page
    .getByRole("link", { name: "Đăng bài cho thuê", exact: true })
    .first();
  await postButton.hover();
  await expect(postButton).toHaveCSS("background-color", "rgb(232, 178, 62)");
  await expect(postButton).toHaveCSS("color", "rgb(255, 255, 255)");
  await expect(postButton).toHaveCSS("border-color", "rgba(0, 0, 0, 0)");
  await expect(postButton).toHaveCSS("transform", "none");
  await page.evaluate(() => {
    const key = Object.keys(localStorage).find((key) =>
      key.startsWith("findmyroom-demo-v1:"),
    );
    const data = JSON.parse(localStorage.getItem(key));
    data.posts[1].title = "Phòng đã cập nhật trong quản lý";
    localStorage.setItem(key, JSON.stringify(data));
  });
  await page.reload();
  const second = page.locator(".manage-post").nth(1);
  await expect(second.getByRole("button", { name: "Chỉnh sửa", exact: true })).toHaveCSS(
    "border-radius",
    "7px",
  );
  await expect(second.getByRole("button", { name: /^Xóa bài / })).toHaveCSS(
    "color",
    "rgb(255, 255, 255)",
  );
  const imageBox = await second.locator("img").boundingBox();
  await page.mouse.click(
    imageBox.x + imageBox.width / 2,
    imageBox.y + imageBox.height / 2,
  );
  await expect(page).toHaveURL(/phong\/an-binh/);
  await expect(page.getByRole("heading", { level: 1 })).toHaveText(
    "Phòng đã cập nhật trong quản lý",
  );
  await expect(page.locator(".remaining-rooms")).toContainText("2 phòng");
  await expect(page.locator(".internet-cost")).toContainText("100.000 đ / tháng");
  await page.reload();
  await expect(page.getByRole("heading", { level: 1 })).toHaveText(
    "Phòng đã cập nhật trong quản lý",
  );
  await page
    .getByRole("link", { name: "Quay lại quản lý bài đăng", exact: true })
    .click();
  await expect(page).toHaveURL(/quan-ly\/bai-dang/);
  await page
    .locator(".manage-post")
    .first()
    .click({ position: { x: 10, y: 10 } });
  await expect(page).toHaveURL(/phong\/minh-an/);
  await page
    .getByRole("link", { name: "Quay lại quản lý bài đăng", exact: true })
    .click();
  await second
    .getByRole("link", { name: "Phòng đã cập nhật trong quản lý", exact: true })
    .focus();
  await page.keyboard.press("Enter");
  await expect(page).toHaveURL(/phong\/an-binh/);
  await page
    .getByRole("link", { name: "Quay lại quản lý bài đăng", exact: true })
    .click();
  await second.getByRole("button", { name: "Chỉnh sửa", exact: true }).click();
  await expect(page).toHaveURL(/quan-ly\/bai-dang/);
  await expect(page.getByRole("dialog")).toBeVisible();
  await page
    .getByRole("button", { name: "Đóng chỉnh sửa bài đăng", exact: true })
    .click();
  await second.getByRole("button", { name: /^Xóa bài / }).click();
  await expect(page.getByRole("dialog")).toBeVisible();
  await expect(page).toHaveURL(/quan-ly\/bai-dang/);
  await page
    .getByRole("dialog")
    .getByRole("button", { name: "Hủy", exact: true })
    .click();
  await expect(page.locator(".manage-post")).toHaveCount(3);
});

test("home, functional search, empty results and room detail", async ({ page }) => {
  const errors = [];
  page.on("pageerror", (e) => errors.push(e.message));
  await page.goto("/#/");
  await expect(page.getByRole("heading", { level: 1 })).toContainText("Tìm phòng trọ");
  await page.getByRole("textbox", { name: "Từ khóa tìm kiếm" }).fill("khongcophongnay");
  await page.getByRole("button", { name: "Tìm kiếm", exact: true }).click();
  await expect(
    page.getByRole("heading", { name: "Không tìm thấy kết quả phù hợp!" }),
  ).toBeVisible();
  await page.getByRole("button", { name: "Xóa bộ lọc", exact: true }).click();
  await expect(page.locator(".room-card")).toHaveCount(4);
  await page
    .locator(".room-card")
    .first()
    .getByRole("link", { name: /Xem chi tiết/ })
    .click();
  await expect(page.getByRole("heading", { level: 1 })).toContainText("Phòng có gác");
  await page.getByRole("button", { name: "Ảnh tiếp theo" }).click();
  await expect(page.locator(".photo-counter")).toContainText("2 / 4");
  expect(errors).toEqual([]);
});
test("demo login and profile persist without storing passwords", async ({ page }) => {
  await login(page);
  await expect(
    page.locator(".profile-links").getByRole("link", { name: /Tin đã lưu/ }),
  ).toHaveCount(0);
  await page.goto("/#/ho-so");
  await page.getByRole("button", { name: "Chỉnh sửa", exact: true }).click();
  await page.getByLabel("Họ và tên", { exact: true }).fill("Nguyễn Văn Đạt");
  await page.getByRole("button", { name: "Lưu thay đổi" }).click();
  await page.getByRole("button", { name: "Xác nhận lưu" }).click();
  await expect(page.getByRole("status")).toContainText("Đã lưu");
  expect(
    await page.evaluate(() => localStorage.getItem("findmyroom-demo-v1")),
  ).not.toContain("demopass123");
  await page.reload();
  await expect(
    page.getByRole("heading", { name: "Thông tin cá nhân", exact: true }),
  ).toBeVisible();
  await expect(page.getByLabel("Họ và tên", { exact: true })).toHaveValue(
    "Nguyễn Văn Đạt",
  );
  await expect(
    page
      .locator("header")
      .getByRole("button", { name: "Tài khoản Nguyễn Văn Đạt", exact: true }),
  ).toBeVisible();
  expect(
    await page.evaluate(() => sessionStorage.getItem("findmyroom-session-v1")),
  ).toBeNull();
  const session = (await page.context().cookies()).find(
    (cookie) => cookie.name === "findmyroom_session",
  );
  expect(session.httpOnly).toBeTruthy();
  expect(await page.evaluate(() => document.cookie)).not.toContain("findmyroom_session");
});
test("header account actions follow login, navigation and logout", async ({ page }) => {
  const header = page.locator("header");
  await page.goto("/#/");
  await expect(
    header.getByRole("link", { name: "Đăng nhập", exact: true }),
  ).toBeVisible();
  await expect(
    header.getByRole("link", { name: "Quản lý bài đăng", exact: true }),
  ).toHaveCount(0);
  await login(page);
  await expect(header.getByRole("link", { name: "Đăng nhập", exact: true })).toHaveCount(
    0,
  );
  const trigger = header.getByRole("button", { name: /^Tài khoản / });
  await trigger.click();
  const account = header.getByRole("navigation", { name: "Tài khoản", exact: true });
  await expect(account).toContainText("sinhvien@example.com");
  await expect(account).toContainText("Sinh viên");
  await expect(
    account.getByRole("link", { name: "Quản lý bài đăng", exact: true }),
  ).toHaveCount(0);
  await expect(
    account.getByRole("link", { name: "Quản lý nhà trọ", exact: true }),
  ).toHaveCount(0);
  await expect(
    account.getByRole("link", { name: "Đăng bài ghép trọ", exact: true }),
  ).toBeVisible();
  await page.keyboard.press("Escape");
  await expect(trigger).toBeFocused();
  await expect(account).toHaveCount(0);
  await trigger.click();
  await page.locator("main h1").click();
  await expect(account).toHaveCount(0);
  await trigger.click();
  await expect(
    account.getByRole("link", { name: "Tin đã lưu", exact: true }),
  ).toHaveCount(0);
  await account.getByRole("link", { name: "Hồ sơ của tôi", exact: true }).click();
  await expect(page).toHaveURL(/ho-so/);
  await expect(account).toHaveCount(0);
  await trigger.click();
  await account.getByRole("button", { name: "Đăng xuất", exact: true }).click();
  await expect(
    header.getByRole("link", { name: "Đăng nhập", exact: true }),
  ).toBeVisible();
  expect(
    await page.evaluate(() => sessionStorage.getItem("findmyroom-session-v1")),
  ).toBeNull();
  await page.reload();
  await expect(
    header.getByRole("link", { name: "Đăng nhập", exact: true }),
  ).toBeVisible();
  await page.goto("/#/ho-so");
  await expect(
    page.getByRole("heading", { name: "Không gian của riêng bạn" }),
  ).toBeVisible();
});
test("mobile navigation shows guest, student and landlord actions without overflow", async ({
  page,
}) => {
  await page.setViewportSize({ width: 360, height: 844 });
  const header = page.locator("header");
  const toggle = header.getByRole("button", { name: "Mở menu", exact: true });
  const mobile = header.getByRole("navigation", {
    name: "Điều hướng menu điện thoại",
    exact: true,
  });
  await page.goto("/#/");
  await toggle.click();
  await expect(mobile.getByRole("link", { name: "Đăng ký", exact: true })).toBeVisible();
  await expect(mobile.getByRole("link", { name: /Quản lý/ })).toHaveCount(0);
  await login(page);
  await toggle.click();
  await expect(
    mobile.getByRole("link", { name: "Quản lý bài đăng", exact: true }),
  ).toHaveCount(0);
  await expect(
    mobile.getByRole("link", { name: "Quản lý nhà trọ", exact: true }),
  ).toHaveCount(0);
  await mobile.getByRole("button", { name: "Đăng xuất", exact: true }).click();
  await expect(
    header.getByRole("link", { name: "Đăng nhập", exact: true }),
  ).toBeVisible();
  await login(page, "landlord");
  await page.reload();
  await toggle.click();
  await expect(
    mobile.getByRole("link", { name: "Quản lý bài đăng", exact: true }),
  ).toBeVisible();
  await expect(
    mobile.getByRole("link", { name: "Quản lý nhà trọ", exact: true }),
  ).toBeVisible();
  await expect(
    mobile.getByRole("link", { name: "Đăng bài cho thuê", exact: true }),
  ).toBeVisible();
  await expect(
    mobile.getByRole("link", { name: "Đăng bài ghép trọ", exact: true }),
  ).toHaveCount(0);
  await header.getByRole("button", { name: /^Tài khoản / }).click();
  await expect(mobile).toHaveCount(0);
  await expect(
    header.getByRole("navigation", { name: "Tài khoản", exact: true }),
  ).toContainText("Chủ trọ");
  expect(
    await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth),
  ).toBeTruthy();
  await header
    .getByRole("navigation", { name: "Tài khoản", exact: true })
    .getByRole("button", { name: "Đăng xuất", exact: true })
    .click();
  await expect(
    page
      .getByRole("navigation", { name: "Điều hướng điện thoại", exact: true })
      .getByRole("link", { name: "Đăng nhập", exact: true }),
  ).toBeVisible();
});
test("invalid saved sessions do not break the guest header", async ({ page }) => {
  await page.goto("/#/");
  for (const value of [
    "{broken",
    JSON.stringify({ name: 42, email: "guest@example.com", role: "landlord" }),
  ]) {
    await page.evaluate(
      (value) => sessionStorage.setItem("findmyroom-session-v1", value),
      value,
    );
    await page.reload();
    await expect(
      page.locator("header").getByRole("link", { name: "Đăng nhập", exact: true }),
    ).toBeVisible();
    expect(
      await page.evaluate(() => sessionStorage.getItem("findmyroom-session-v1")),
    ).toBeNull();
  }
});
test("roommate controls allow skip, undo back and view post details", async ({
  page,
}) => {
  await login(page, "student", "/ghep-tro");
  await page.getByRole("button", { name: "Bắt đầu ghép trọ" }).click();
  await expect(page.locator(".person-card")).toContainText("Lam Thư");
  const backButton = page.getByRole("button", { name: /Quay lại/ });
  await expect(backButton).toBeDisabled();
  await page.getByRole("button", { name: "Bỏ qua", exact: true }).click();
  await expect(page.locator(".person-card")).toContainText("Hoàng Hiếu");
  await expect(backButton).toBeEnabled();
  await backButton.click();
  await expect(page.locator(".person-card")).toContainText("Lam Thư");
  await page.getByRole("button", { name: "Xem chi tiết", exact: true }).click();
  await expect(page).toHaveURL(/phong\/ghep-thu/);
  await expect(page.getByRole("heading", { name: /Tìm bạn nữ ở ghép/ })).toBeVisible();
  await page.getByRole("link", { name: "Quay lại ghép trọ", exact: true }).click();
  await expect(page).toHaveURL(/ghep-tro/);
  await expect(page.locator(".person-card")).toContainText("Lam Thư");
});
test("landlord house create edit and delete", async ({ page }) => {
  await login(page, "landlord", "/quan-ly/nha-tro");
  await expect(page.locator(".table-header")).not.toContainText("Trạng thái");
  await expect(page.locator(".house-row .badge")).toHaveCount(0);
  await expect(page.locator(".house-summary img")).toHaveCount(1);
  expect(
    await page
      .locator(".house-row")
      .first()
      .evaluate((el) => getComputedStyle(el).borderTopStyle),
  ).toBe("solid");
  await expect(page.locator(".house-row").first()).toHaveCSS(
    "border-color",
    "rgba(19, 20, 20, 0.15)",
  );
  const addHouse = page.getByRole("button", { name: "Thêm nhà trọ", exact: true });
  const buttonColor = await addHouse.evaluate(
    (el) => getComputedStyle(el).backgroundColor,
  );
  await addHouse.hover();
  await expect(addHouse).toHaveCSS("background-color", "rgb(255, 255, 255)");
  await expect(addHouse).toHaveCSS("color", buttonColor);
  await expect(addHouse).toHaveCSS("border-width", "3px");
  await expect(addHouse).toHaveCSS("transform", "none");
  const firstHouse = page.locator(".house-row").first();
  await expect(firstHouse).toHaveCSS("transition-duration", "0.4s, 0.4s, 0.4s");
  await expect(
    firstHouse.getByRole("button", { name: "Xóa Nhà trọ Minh An", exact: true }),
  ).toHaveCSS("color", "rgb(255, 255, 255)");
  await expect(
    firstHouse.getByRole("button", { name: "Chỉnh sửa Nhà trọ Minh An", exact: true }),
  ).toHaveCSS("border-radius", "7px");
  await firstHouse.hover();
  await expect(firstHouse).toHaveCSS("border-color", "rgb(99, 141, 146)");
  await expect(
    firstHouse.getByRole("link", { name: "Nhà trọ Minh An", exact: true }),
  ).toHaveCSS("text-decoration-line", "none");
  const houseImage = await firstHouse.locator("img").boundingBox();
  await page.mouse.click(
    houseImage.x + houseImage.width / 2,
    houseImage.y + houseImage.height / 2,
  );
  await expect(page).toHaveURL(/nha-tro\/minh-an/);
  await expect(page.getByRole("heading", { level: 1 })).toHaveText("Nhà trọ Minh An");
  await expect(
    page.getByRole("region", { name: "Thông tin chi tiết nhà trọ" }),
  ).toContainText("36 phòng");
  await expect(page.locator(".room-card")).toHaveCount(1);
  await page
    .locator(".room-card")
    .getByRole("link", { name: /Xem chi tiết/ })
    .click();
  await expect(page).toHaveURL(/phong\/minh-an/);
  await page.getByRole("link", { name: "Quay lại nhà trọ", exact: true }).click();
  await page.getByRole("link", { name: "Quay lại quản lý nhà trọ", exact: true }).click();
  await page.getByRole("button", { name: "Thêm nhà trọ", exact: true }).click();
  await page.getByLabel("Tên nhà trọ *").fill("Nhà trọ kiểm thử");
  await page.getByRole("button", { name: /Tiếp theo/ }).click();
  await page.getByLabel("Địa chỉ *", { exact: true }).fill("123 đường 3/2 Cần Thơ");
  await page.getByRole("button", { name: /Tiếp theo/ }).click();
  await page.getByRole("button", { name: /Tạo nhà trọ|Lưu nhà trọ/ }).click();
  await expect(
    page.getByRole("heading", { name: "Nhà trọ kiểm thử", exact: true }),
  ).toBeVisible();
  await page.getByRole("link", { name: "Nhà trọ kiểm thử", exact: true }).focus();
  await page.keyboard.press("Enter");
  await expect(page.getByRole("heading", { level: 1 })).toHaveText("Nhà trọ kiểm thử");
  await expect(page.getByRole("region", { name: "Bài đăng của nhà trọ" })).toContainText(
    "chưa có bài đăng phòng",
  );
  await page.reload();
  await expect(page.getByRole("heading", { level: 1 })).toHaveText("Nhà trọ kiểm thử");
  await page.getByRole("link", { name: "Quay lại quản lý nhà trọ", exact: true }).click();
  await page
    .getByRole("button", { name: "Chỉnh sửa Nhà trọ kiểm thử", exact: true })
    .click();
  await page.getByRole("button", { name: "Lưu nhà trọ", exact: true }).click();
  await expect(page.locator(".house-row").last()).toContainText("Nhà trọ kiểm thử");
  await page.setViewportSize({ width: 390, height: 844 });
  expect(
    await page
      .locator(".house-row")
      .last()
      .evaluate((el) => el.scrollWidth <= el.clientWidth),
  ).toBeTruthy();
  await page.getByRole("button", { name: "Xóa Nhà trọ kiểm thử", exact: true }).click();
  await page.getByRole("button", { name: "Xác nhận xóa", exact: true }).click();
  await expect(page.locator(".house-row")).toHaveCount(1);
});
test("roommate posting validates, retains draft and unlocks management only for its author", async ({
  page,
  context,
}) => {
  await login(page, "student", "/dang-bai/roommate");
  await expect(
    page.locator("header").getByRole("link", { name: "Quản lý bài đăng", exact: true }),
  ).toHaveCount(0);
  await page.getByRole("button", { name: "Tiếp theo", exact: true }).click();
  await expect(page.locator(".error").first()).toBeVisible();
  await expect(page.getByLabel("Tiêu đề bài đăng *")).toBeFocused();
  await page.getByLabel("Tiêu đề bài đăng *").fill("Tìm bạn ở ghép kiểm thử");
  await page.getByLabel("Ngày có thể chuyển vào *").fill("2027-12-10");
  for (const label of [
    "Diện tích (m²) *",
    "Tiền trọ (đ) *",
    "Dự kiến giá/người (đ) *",
    "Tiền điện (đ/kWh) *",
    "Tiền nước (đ/m³) *",
  ])
    await page.getByLabel(label, { exact: true }).fill("100");
  await page
    .getByLabel("Mô tả chi tiết", { exact: true })
    .fill("Phòng thoáng gần trường, giờ giấc tự do.");
  await page.getByRole("button", { name: "Tiếp theo", exact: true }).click();
  await context.grantPermissions(["geolocation"]);
  await context.setGeolocation({ latitude: 10.03076, longitude: 105.76891 });
  await page.getByRole("button", { name: "Vị trí hiện tại", exact: true }).click();
  await expect(page.getByRole("status")).toContainText("Đã lấy tọa độ thành công!");
  await expect(page.getByRole("status")).toContainText("10.03076");
  await page.getByLabel("Phường / Xã *").selectOption("Xuân Khánh");
  await page.getByLabel("Tên đường / số nhà *").fill("123 đường 3/2");
  await page.getByRole("button", { name: "Trước", exact: true }).click();
  await expect(page.getByLabel("Tiêu đề bài đăng *")).toHaveValue(
    "Tìm bạn ở ghép kiểm thử",
  );
  await page.getByRole("button", { name: "Tiếp theo", exact: true }).click();
  await page.getByRole("button", { name: "Tiếp theo", exact: true }).click();
  const png = Buffer.from(
    "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+kvKkAAAAASUVORK5CYII=",
    "base64",
  );
  await page
    .getByLabel("Tải hình ảnh chỗ ở")
    .setInputFiles(
      [1, 2, 3].map((i) => ({
        name: "room" + i + ".png",
        mimeType: "image/png",
        buffer: png,
      })),
    );
  await expect(page.locator(".upload-grid img")).toHaveCount(3);
  await page.getByRole("button", { name: "Tiếp theo", exact: true }).click();
  await page.getByLabel("Camera 24/7", { exact: true }).check();
  await page.getByRole("button", { name: "Xem trước", exact: true }).click();
  await expect(page.getByRole("dialog")).toContainText("Tìm bạn ở ghép kiểm thử");
  await page
    .getByRole("dialog")
    .getByRole("button", { name: "Đăng bài", exact: true })
    .click();
  await expect(page.getByRole("heading", { name: "Bài đăng đã được lưu" })).toBeVisible();
  await expect(
    page.locator("header").getByRole("link", { name: "Quản lý bài đăng", exact: true }),
  ).toBeVisible();
  await page.reload();
  await expect(
    page.locator("header").getByRole("link", { name: "Quản lý bài đăng", exact: true }),
  ).toBeVisible();
  await page
    .locator("header")
    .getByRole("button", { name: /^Tài khoản / })
    .click();
  await expect(
    page
      .getByRole("navigation", { name: "Tài khoản", exact: true })
      .getByRole("link", { name: "Quản lý bài đăng", exact: true }),
  ).toBeVisible();
  await page.keyboard.press("Escape");
  await page.setViewportSize({ width: 390, height: 844 });
  await page.getByRole("button", { name: "Mở menu", exact: true }).click();
  await expect(
    page
      .getByRole("navigation", { name: "Điều hướng menu điện thoại", exact: true })
      .getByRole("link", { name: "Quản lý bài đăng", exact: true }),
  ).toBeVisible();
  await page.getByRole("button", { name: "Mở menu", exact: true }).click();
  await page.setViewportSize({ width: 1280, height: 900 });
  const registered = await context.request.post("/api/auth/register", {
    data: {
      name: "Sinh viên mới",
      email: "student-header-" + Date.now() + "@example.com",
      phone: "0912345678",
      password: "demopass123",
      role: "student",
      terms: true,
    },
  });
  expect(registered.status()).toBe(201);
  await page.goto("/#/");
  await page.reload();
  await expect(
    page.locator("header").getByRole("link", { name: "Quản lý bài đăng", exact: true }),
  ).toHaveCount(0);
  const signedIn = await context.request.post("/api/auth/login", {
    data: { email: "sinhvien@example.com", password: "demopass123" },
  });
  expect(signedIn.ok()).toBeTruthy();
  await page.goto("/#/quan-ly/bai-dang");
  await page.reload();
  await expect(
    page.locator("header").getByRole("link", { name: "Quản lý bài đăng", exact: true }),
  ).toBeVisible();
  await page.getByRole("link", { name: "Quản lý bài đăng", exact: true }).first().click();
  await expect(page.locator(".manage-post").first()).toContainText(
    "Tìm bạn ở ghép kiểm thử",
  );
  await page
    .getByRole("button", { name: "Xóa bài Tìm bạn ở ghép kiểm thử", exact: true })
    .click();
  await page
    .getByRole("dialog")
    .getByRole("button", { name: "Xác nhận xóa", exact: true })
    .click();
  await expect(
    page.locator("header").getByRole("link", { name: "Quản lý bài đăng", exact: true }),
  ).toHaveCount(0);
  await page.reload();
  await expect(
    page.locator("header").getByRole("link", { name: "Quản lý bài đăng", exact: true }),
  ).toHaveCount(0);
});
test("all 140 references load and select desktop/mobile source", async ({
  page,
  request,
}) => {
  const index = await (await request.get("/references/index.json")).json();
  expect(index).toHaveLength(140);
  for (const s of index) {
    const r = await request.get("/references/" + s.screenCode + ".json");
    expect(r.ok()).toBeTruthy();
    const d = await r.json();
    expect(d.canvas.width).toBe(s.width);
  }
  await page.goto("/#/wireframes?screen=GT-06");
  await expect(page.locator(".wireframe-canvas")).toBeVisible();
  await expect(page.locator(".reference-toolbar strong")).toContainText("GT-06");
  await page.getByLabel("Chế độ đối chiếu").selectOption("original");
  await expect(page.getByAltText(/wireframe gốc/)).toBeVisible();
});
test("desktop and mobile layouts have no horizontal overflow", async ({ page }) => {
  for (const width of [1440, 390, 360]) {
    await page.setViewportSize({ width, height: 900 });
    for (const path of ["/", "/tim-tro", "/ghep-tro", "/dang-nhap", "/phong/minh-an"]) {
      await page.goto("/#" + path);
      await page.waitForTimeout(120);
      expect(
        await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth),
        `${width} ${path}`,
      ).toBeTruthy();
    }
  }
  await page.setViewportSize({ width: 1440, height: 1000 });
  await page.goto("/#/");
  await page.screenshot({ path: "review/home-desktop.png", fullPage: true });
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/#/");
  await page.screenshot({ path: "review/home-mobile.png", fullPage: true });
});
test("signup creates an account that can log out and log back in", async ({ page }) => {
  await page.goto("/#/dang-ky");
  await page.getByLabel("Họ và tên *", { exact: true }).fill("Lê Thảo Nguyên");
  await page.getByLabel("Email *", { exact: true }).fill("nguyen@example.com");
  await page.getByLabel("Số điện thoại *", { exact: true }).fill("0912345678");
  await page.getByLabel("Mật khẩu *", { exact: true }).fill("demo12345");
  await page.getByLabel("Xác nhận mật khẩu *", { exact: true }).fill("demo12345");
  await page.getByRole("checkbox").check();
  await page
    .locator("form")
    .getByRole("button", { name: "Đăng ký", exact: true })
    .click();
  await page.getByRole("radio", { name: "Sinh Viên" }).click();
  await expect(page).toHaveURL(/#\/$/);
  await page.goto("/#/ho-so");
  await expect(
    page.getByRole("heading", { name: "Thông tin cá nhân", exact: true }),
  ).toBeVisible();
  await expect(page.getByLabel("Họ và tên", { exact: true })).toHaveValue(
    "Lê Thảo Nguyên",
  );
  await page
    .locator("header")
    .getByRole("button", { name: "Tài khoản Lê Thảo Nguyên", exact: true })
    .click();
  await page
    .getByRole("navigation", { name: "Tài khoản", exact: true })
    .getByRole("button", { name: "Đăng xuất", exact: true })
    .click();
  await expect(
    page.locator("header").getByRole("link", { name: "Đăng nhập", exact: true }),
  ).toBeVisible();
  await page.goto("/#/dang-nhap");
  await page.getByLabel("Email *", { exact: true }).fill("nguyen@example.com");
  await page.getByLabel("Mật khẩu *", { exact: true }).fill("demo12345");
  await page
    .locator("form")
    .getByRole("button", { name: "Đăng nhập", exact: true })
    .click();
  await expect(page).toHaveURL(/#\/$/);
  await page.goto("/#/ho-so");
  await expect(
    page.getByRole("heading", { name: "Thông tin cá nhân", exact: true }),
  ).toBeVisible();
  await expect(page.getByLabel("Họ và tên", { exact: true })).toHaveValue(
    "Lê Thảo Nguyên",
  );
});
test("landlord five-step rental posting, preview, save and edit", async ({ page }) => {
  await login(page, "landlord", "/dang-bai/rental");
  await page
    .getByLabel("Tiêu đề bài đăng *", { exact: true })
    .fill("Cho thuê phòng kiểm thử");
  await page.getByLabel("Chọn nhà trọ *", { exact: true }).selectOption("minh-an");
  await page.getByLabel("Giá thuê (đ/tháng) *", { exact: true }).fill("1800000");
  await page.getByLabel("Diện tích (m²) *", { exact: true }).fill("24");
  await page.getByLabel("Giá điện (đ/kWh) *", { exact: true }).fill("3500");
  await page.getByLabel("Giá nước (đ/m³) *", { exact: true }).fill("18000");
  await page
    .getByLabel("Mô tả chi tiết", { exact: true })
    .fill("Phòng mẫu gần trường, có chỗ để xe.");
  await page.getByRole("button", { name: "Tiếp theo", exact: true }).click();
  await page.getByLabel("Phường / Xã *").selectOption("Xuân Khánh");
  await page.getByLabel("Tên đường / số nhà *").fill("Hẻm 51, đường 3/2");
  await page.getByRole("button", { name: "Tiếp theo", exact: true }).click();
  const png = Buffer.from(
    "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+kvKkAAAAASUVORK5CYII=",
    "base64",
  );
  await page
    .getByLabel("Tải hình ảnh chỗ ở")
    .setInputFiles(
      [1, 2, 3].map((i) => ({
        name: "room" + i + ".png",
        mimeType: "image/png",
        buffer: png,
      })),
    );
  await page.getByRole("button", { name: "Tiếp theo", exact: true }).click();
  await page.getByLabel("Wifi tốc độ cao", { exact: true }).check();
  await page.getByRole("button", { name: "Tiếp theo", exact: true }).click();
  await expect(
    page.getByRole("heading", { name: "Xem trước bài đăng", exact: true }),
  ).toBeVisible();
  await page.getByRole("button", { name: "Đăng bài", exact: true }).click();
  await expect(page.getByRole("heading", { name: "Bài đăng đã được lưu" })).toBeVisible();
  await page.goto("/#/quan-ly/bai-dang");
  await page
    .locator(".manage-post")
    .first()
    .getByRole("button", { name: "Chỉnh sửa" })
    .click();
  await expect(page.getByLabel("Tiêu đề bài đăng *", { exact: true })).toHaveValue(
    "Cho thuê phòng kiểm thử",
  );
});
test("authorized pages stay within mobile viewport and modal keyboard focus is contained", async ({
  page,
}) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await login(page, "landlord");
  for (const path of [
    "/ho-so",
    "/quan-ly/nha-tro",
    "/quan-ly/bai-dang",
    "/dang-bai/rental",
  ]) {
    await page.goto("/#" + path);
    expect(
      await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth),
      path,
    ).toBeTruthy();
  }
  await page.goto("/#/quan-ly/nha-tro");
  await page.getByRole("button", { name: "Thêm nhà trọ", exact: true }).click();
  await expect(page.getByRole("dialog")).toBeVisible();
  await page.keyboard.press("Tab");
  expect(
    await page.evaluate(() =>
      document.querySelector("[role=dialog]").contains(document.activeElement),
    ),
  ).toBeTruthy();
  await page.keyboard.press("Escape");
  await expect(page.getByRole("dialog")).toHaveCount(0);
});
