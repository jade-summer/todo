import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, it, expect, vi, beforeEach } from "vitest";
import TodoApp from "./TodoApp";

const STORAGE_KEY = "todo-app-items";

beforeEach(() => {
  localStorage.clear();
  vi.stubGlobal(
    "crypto",
    Object.assign({}, crypto, {
      randomUUID: (() => {
        let i = 0;
        return () => `uuid-${++i}`;
      })(),
    })
  );
});

async function addTodo(user: ReturnType<typeof userEvent.setup>, text: string) {
  const input = screen.getByPlaceholderText("新しいTODOを入力...");
  await user.type(input, text);
  await user.click(screen.getByRole("button", { name: "追加" }));
}

describe("TodoApp", () => {
  describe("初期表示", () => {
    it("タイトル・入力欄・フィルターボタン・空メッセージを表示する", () => {
      render(<TodoApp />);

      expect(screen.getByRole("heading", { name: "TODO" })).toBeInTheDocument();
      expect(screen.getByPlaceholderText("新しいTODOを入力...")).toBeInTheDocument();
      expect(screen.getByRole("button", { name: "追加" })).toBeInTheDocument();
      expect(screen.getByText("すべて")).toBeInTheDocument();
      expect(screen.getByText("未完了")).toBeInTheDocument();
      expect(screen.getByText("完了済み")).toBeInTheDocument();
      expect(screen.getByText("TODOがありません")).toBeInTheDocument();
      expect(screen.getByText("0 件の未完了タスク")).toBeInTheDocument();
    });
  });

  describe("TODO追加", () => {
    it("テキストを入力して追加ボタンをクリックするとTODOが追加される", async () => {
      const user = userEvent.setup();
      render(<TodoApp />);

      await addTodo(user, "買い物に行く");

      expect(screen.getByText("買い物に行く")).toBeInTheDocument();
      expect(screen.queryByText("TODOがありません")).not.toBeInTheDocument();
      expect(screen.getByText("1 件の未完了タスク")).toBeInTheDocument();
    });

    it("空文字のTODOは追加されない", async () => {
      const user = userEvent.setup();
      render(<TodoApp />);

      await user.click(screen.getByRole("button", { name: "追加" }));

      expect(screen.getByText("TODOがありません")).toBeInTheDocument();
      expect(screen.getByText("0 件の未完了タスク")).toBeInTheDocument();
    });

    it("空白のみのTODOは追加されない", async () => {
      const user = userEvent.setup();
      render(<TodoApp />);

      const input = screen.getByPlaceholderText("新しいTODOを入力...");
      await user.type(input, "   ");
      await user.click(screen.getByRole("button", { name: "追加" }));

      expect(screen.getByText("TODOがありません")).toBeInTheDocument();
    });

    it("追加後に入力欄がクリアされる", async () => {
      const user = userEvent.setup();
      render(<TodoApp />);

      await addTodo(user, "テスト");

      const input = screen.getByPlaceholderText("新しいTODOを入力...");
      expect(input).toHaveValue("");
    });

    it("Enterキーでもフォーム送信できる", async () => {
      const user = userEvent.setup();
      render(<TodoApp />);

      const input = screen.getByPlaceholderText("新しいTODOを入力...");
      await user.type(input, "Enterで追加{Enter}");

      expect(screen.getByText("Enterで追加")).toBeInTheDocument();
    });

    it("複数のTODOを追加できる", async () => {
      const user = userEvent.setup();
      render(<TodoApp />);

      await addTodo(user, "タスク1");
      await addTodo(user, "タスク2");
      await addTodo(user, "タスク3");

      expect(screen.getByText("タスク1")).toBeInTheDocument();
      expect(screen.getByText("タスク2")).toBeInTheDocument();
      expect(screen.getByText("タスク3")).toBeInTheDocument();
      expect(screen.getByText("3 件の未完了タスク")).toBeInTheDocument();
    });
  });

  describe("TODO完了切り替え", () => {
    it("チェックボックスをクリックすると完了状態が切り替わる", async () => {
      const user = userEvent.setup();
      render(<TodoApp />);

      await addTodo(user, "完了テスト");

      const checkbox = screen.getByRole("checkbox");
      expect(checkbox).not.toBeChecked();

      await user.click(checkbox);
      expect(checkbox).toBeChecked();
      expect(screen.getByText("0 件の未完了タスク")).toBeInTheDocument();
    });

    it("完了済みを再度クリックすると未完了に戻る", async () => {
      const user = userEvent.setup();
      render(<TodoApp />);

      await addTodo(user, "トグルテスト");

      const checkbox = screen.getByRole("checkbox");
      await user.click(checkbox);
      expect(checkbox).toBeChecked();

      await user.click(checkbox);
      expect(checkbox).not.toBeChecked();
      expect(screen.getByText("1 件の未完了タスク")).toBeInTheDocument();
    });
  });

  describe("TODO削除", () => {
    it("削除ボタンをクリックするとTODOが削除される", async () => {
      const user = userEvent.setup();
      render(<TodoApp />);

      await addTodo(user, "削除テスト");
      expect(screen.getByText("削除テスト")).toBeInTheDocument();

      await user.click(screen.getByRole("button", { name: "削除" }));

      expect(screen.queryByText("削除テスト")).not.toBeInTheDocument();
      expect(screen.getByText("TODOがありません")).toBeInTheDocument();
      expect(screen.getByText("0 件の未完了タスク")).toBeInTheDocument();
    });

    it("複数のTODOから特定のものだけ削除できる", async () => {
      const user = userEvent.setup();
      render(<TodoApp />);

      await addTodo(user, "残す");
      await addTodo(user, "消す");

      const deleteButtons = screen.getAllByRole("button", { name: "削除" });
      await user.click(deleteButtons[1]);

      expect(screen.getByText("残す")).toBeInTheDocument();
      expect(screen.queryByText("消す")).not.toBeInTheDocument();
    });
  });

  describe("フィルタリング", () => {
    async function setupFilterTest() {
      const user = userEvent.setup();
      render(<TodoApp />);

      await addTodo(user, "未完了タスク");
      await addTodo(user, "完了タスク");

      // 2つ目のTODOを完了にする
      const checkboxes = screen.getAllByRole("checkbox");
      await user.click(checkboxes[1]);

      return user;
    }

    it("「すべて」フィルターはすべてのTODOを表示する", async () => {
      const user = await setupFilterTest();

      await user.click(screen.getByText("すべて"));

      expect(screen.getByText("未完了タスク")).toBeInTheDocument();
      expect(screen.getByText("完了タスク")).toBeInTheDocument();
    });

    it("「未完了」フィルターは未完了のTODOのみ表示する", async () => {
      const user = await setupFilterTest();

      await user.click(screen.getByText("未完了"));

      expect(screen.getByText("未完了タスク")).toBeInTheDocument();
      expect(screen.queryByText("完了タスク")).not.toBeInTheDocument();
    });

    it("「完了済み」フィルターは完了済みのTODOのみ表示する", async () => {
      const user = await setupFilterTest();

      await user.click(screen.getByText("完了済み"));

      expect(screen.queryByText("未完了タスク")).not.toBeInTheDocument();
      expect(screen.getByText("完了タスク")).toBeInTheDocument();
    });

    it("フィルター中にTODOがない場合は空メッセージを表示する", async () => {
      const user = userEvent.setup();
      render(<TodoApp />);

      await addTodo(user, "未完了のみ");

      await user.click(screen.getByText("完了済み"));
      expect(screen.getByText("TODOがありません")).toBeInTheDocument();
    });

    it("未完了カウントはフィルターに関係なく全体の未完了数を表示する", async () => {
      const user = await setupFilterTest();

      // 「すべて」フィルター
      expect(screen.getByText("1 件の未完了タスク")).toBeInTheDocument();

      // 「完了済み」フィルターに切り替えてもカウントは変わらない
      await user.click(screen.getByText("完了済み"));
      expect(screen.getByText("1 件の未完了タスク")).toBeInTheDocument();
    });
  });

  describe("localStorage永続化", () => {
    it("追加したTODOがlocalStorageに保存される", async () => {
      const user = userEvent.setup();
      render(<TodoApp />);

      await addTodo(user, "保存テスト");

      const stored = JSON.parse(localStorage.getItem(STORAGE_KEY)!);
      expect(stored).toHaveLength(1);
      expect(stored[0].text).toBe("保存テスト");
      expect(stored[0].completed).toBe(false);
    });

    it("localStorageに保存されたTODOが復元される", async () => {
      const savedTodos = [
        { id: "saved-1", text: "復元タスク1", completed: false },
        { id: "saved-2", text: "復元タスク2", completed: true },
      ];
      localStorage.setItem(STORAGE_KEY, JSON.stringify(savedTodos));

      render(<TodoApp />);

      expect(screen.getByText("復元タスク1")).toBeInTheDocument();
      expect(screen.getByText("復元タスク2")).toBeInTheDocument();
      expect(screen.getByText("1 件の未完了タスク")).toBeInTheDocument();

      const checkboxes = screen.getAllByRole("checkbox");
      expect(checkboxes[0]).not.toBeChecked();
      expect(checkboxes[1]).toBeChecked();
    });

    it("localStorageが不正なJSONの場合は空のリストで開始する", () => {
      localStorage.setItem(STORAGE_KEY, "invalid json");

      render(<TodoApp />);

      expect(screen.getByText("TODOがありません")).toBeInTheDocument();
      expect(screen.getByText("0 件の未完了タスク")).toBeInTheDocument();
    });
  });
});
