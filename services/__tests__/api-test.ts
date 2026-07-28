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

describe("API Douban data handling", () => {
  const client = new API("https://joyflix.example.com");
  const fetchMock = jest.fn();

  beforeEach(() => {
    fetchMock.mockReset();
    global.fetch = fetchMock;
  });

  it("uses the Tencent CDN for regular Douban filters", async () => {
    fetchMock.mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        subjects: [
          {
            title: "测试电影",
            cover: "https://img3.doubanio.com/poster.jpg",
            rate: "8.8",
            card_subtitle: "2026 / 中国大陆",
          },
        ],
      }),
    });

    await expect(client.getDoubanData("movie", "最新", 20, 0)).resolves.toEqual({
      code: 200,
      message: "获取成功",
      list: [
        {
          title: "测试电影",
          poster: "https://img3.doubanio.com/poster.jpg",
          rate: "8.8",
          year: "2026",
        },
      ],
    });
    expect(fetchMock).toHaveBeenCalledWith(
      "https://movie.douban.cmliussss.net/j/search_subjects?type=movie&tag=%E6%9C%80%E6%96%B0&sort=recommend&page_limit=20&page_start=0",
      expect.objectContaining({
        signal: expect.any(AbortSignal),
        headers: { Accept: "application/json" },
      }),
    );
  });

  it("falls back to the authenticated JoyFlix route when the CDN fails", async () => {
    fetchMock
      .mockRejectedValueOnce(new Error("Network request failed"))
      .mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => ({
          code: 200,
          message: "获取成功",
          list: [],
        }),
      });

    await expect(client.getDoubanData("movie", "最新", 20, 0)).resolves.toEqual({
      code: 200,
      message: "获取成功",
      list: [],
    });
    expect(fetchMock).toHaveBeenNthCalledWith(
      2,
      "https://joyflix.example.com/api/douban?type=movie&tag=%E6%9C%80%E6%96%B0&pageSize=20&pageStart=0",
      expect.objectContaining({
        credentials: "include",
        headers: expect.any(Headers),
      }),
    );
  });

  it("keeps Top250 on the JoyFlix route", async () => {
    fetchMock.mockResolvedValueOnce({
      ok: true,
      status: 200,
      json: async () => ({
        code: 200,
        message: "获取成功",
        list: [],
      }),
    });

    await client.getDoubanData("movie", "top250", 20, 0);

    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(fetchMock).toHaveBeenCalledWith(
      "https://joyflix.example.com/api/douban?type=movie&tag=top250&pageSize=20&pageStart=0",
      expect.objectContaining({ credentials: "include" }),
    );
  });
});
