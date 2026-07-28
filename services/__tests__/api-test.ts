import { API } from "../api";

jest.mock("@react-native-async-storage/async-storage", () =>
  require("@react-native-async-storage/async-storage/jest/async-storage-mock"),
);

describe("API poster URL handling", () => {
  const client = new API("https://joyflix.example.com");

  it("uses the Tencent CDN for Douban posters", () => {
    expect(
      client.getImageProxyUrl(
        "http://img3.doubanio.com/view/photo/s_ratio_poster/public/p123.jpg",
      ),
    ).toBe(
      "https://img.doubanio.cmliussss.net/view/photo/s_ratio_poster/public/p123.jpg",
    );
  });

  it("loads non-Douban source posters directly", () => {
    const poster = "https://cdn.example.com/posters/movie.jpg";

    expect(client.getImageProxyUrl(poster)).toBe(poster);
  });

  it("keeps empty and invalid poster values unchanged", () => {
    expect(client.getImageProxyUrl("")).toBe("");
    expect(client.getImageProxyUrl("not a URL")).toBe("not a URL");
  });
});
