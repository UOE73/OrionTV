import { api } from "@/services/api";
import useHomeStore, { Category } from "../homeStore";

jest.mock("@/services/api", () => ({
  api: {
    getDoubanData: jest.fn(),
  },
}));

jest.mock("@/services/storage", () => ({
  PlayRecordManager: {
    getAll: jest.fn(),
  },
}));

jest.mock("../authStore", () => ({
  __esModule: true,
  default: {
    getState: () => ({
      isLoggedIn: true,
      checkLoginStatus: jest.fn().mockResolvedValue(undefined),
    }),
    setState: jest.fn(),
  },
}));

jest.mock("../settingsStore", () => ({
  useSettingsStore: {
    getState: () => ({ apiBaseUrl: "https://joyflix.example.com" }),
  },
}));

const getDoubanDataMock = api.getDoubanData as jest.MockedFunction<
  typeof api.getDoubanData
>;

function deferred<T>() {
  let resolve!: (value: T) => void;
  const promise = new Promise<T>((promiseResolve) => {
    resolve = promiseResolve;
  });
  return { promise, resolve };
}

function selectTestCategory(tag: string): Category {
  const category = { title: `测试电影-${tag}`, type: "movie" as const, tag };
  useHomeStore.getState().selectCategory(category);
  return category;
}

describe("home filter requests", () => {
  beforeEach(() => {
    getDoubanDataMock.mockReset();
  });

  it("does not fetch from selectCategory and deduplicates the initial request", async () => {
    const response = deferred<Awaited<ReturnType<typeof api.getDoubanData>>>();
    getDoubanDataMock.mockReturnValue(response.promise);

    selectTestCategory("去重测试");
    expect(getDoubanDataMock).not.toHaveBeenCalled();

    const firstRequest = useHomeStore.getState().fetchInitialData();
    const duplicateRequest = useHomeStore.getState().fetchInitialData();
    await Promise.resolve();
    await Promise.resolve();

    expect(getDoubanDataMock).toHaveBeenCalledTimes(1);

    response.resolve({
      code: 200,
      message: "获取成功",
      list: [{ title: "唯一结果", poster: "https://example.com/poster.jpg" }],
    });
    await Promise.all([firstRequest, duplicateRequest]);

    expect(useHomeStore.getState().contentData).toHaveLength(1);
    expect(useHomeStore.getState().contentData[0].title).toBe("唯一结果");
  });

  it("does not let a stale filter response overwrite the current filter", async () => {
    const oldResponse = deferred<Awaited<ReturnType<typeof api.getDoubanData>>>();
    const newResponse = deferred<Awaited<ReturnType<typeof api.getDoubanData>>>();

    getDoubanDataMock.mockImplementation((_type, tag) =>
      tag === "旧筛选" ? oldResponse.promise : newResponse.promise,
    );

    selectTestCategory("旧筛选");
    const oldRequest = useHomeStore.getState().fetchInitialData();
    await Promise.resolve();
    await Promise.resolve();

    selectTestCategory("新筛选");
    const newRequest = useHomeStore.getState().fetchInitialData();
    await Promise.resolve();
    await Promise.resolve();

    newResponse.resolve({
      code: 200,
      message: "获取成功",
      list: [{ title: "新结果", poster: "https://example.com/new.jpg" }],
    });
    await newRequest;

    oldResponse.resolve({
      code: 200,
      message: "获取成功",
      list: [{ title: "旧结果", poster: "https://example.com/old.jpg" }],
    });
    await oldRequest;

    expect(useHomeStore.getState().selectedCategory.tag).toBe("新筛选");
    expect(useHomeStore.getState().contentData[0].title).toBe("新结果");
  });
});
