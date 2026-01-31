import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, it, expect, vi } from "vitest";
import TodoItem from "./TodoItem";
import { Todo } from "@/types/todo";

function makeTodo(overrides: Partial<Todo> = {}): Todo {
  return {
    id: "todo-1",
    text: "テストタスク",
    completed: false,
    ...overrides,
  };
}

describe("TodoItem", () => {
  it("未完了のTODOのテキストとチェックボックスを表示する", () => {
    const todo = makeTodo();
    render(<TodoItem todo={todo} onToggle={vi.fn()} onDelete={vi.fn()} />);

    expect(screen.getByText("テストタスク")).toBeInTheDocument();
    const checkbox = screen.getByRole("checkbox");
    expect(checkbox).not.toBeChecked();
  });

  it("完了済みのTODOはチェック済みで取り消し線スタイルが適用される", () => {
    const todo = makeTodo({ completed: true });
    render(<TodoItem todo={todo} onToggle={vi.fn()} onDelete={vi.fn()} />);

    const checkbox = screen.getByRole("checkbox");
    expect(checkbox).toBeChecked();

    const textSpan = screen.getByText("テストタスク");
    expect(textSpan).toHaveClass("completedText");
  });

  it("未完了のTODOには通常のテキストスタイルが適用される", () => {
    const todo = makeTodo({ completed: false });
    render(<TodoItem todo={todo} onToggle={vi.fn()} onDelete={vi.fn()} />);

    const textSpan = screen.getByText("テストタスク");
    expect(textSpan).toHaveClass("text");
    expect(textSpan).not.toHaveClass("completedText");
  });

  it("チェックボックスをクリックするとonToggleがTODOのIDで呼ばれる", async () => {
    const user = userEvent.setup();
    const onToggle = vi.fn();
    const todo = makeTodo({ id: "abc-123" });

    render(<TodoItem todo={todo} onToggle={onToggle} onDelete={vi.fn()} />);

    await user.click(screen.getByRole("checkbox"));
    expect(onToggle).toHaveBeenCalledTimes(1);
    expect(onToggle).toHaveBeenCalledWith("abc-123");
  });

  it("削除ボタンをクリックするとonDeleteがTODOのIDで呼ばれる", async () => {
    const user = userEvent.setup();
    const onDelete = vi.fn();
    const todo = makeTodo({ id: "abc-456" });

    render(<TodoItem todo={todo} onToggle={vi.fn()} onDelete={onDelete} />);

    await user.click(screen.getByRole("button", { name: "削除" }));
    expect(onDelete).toHaveBeenCalledTimes(1);
    expect(onDelete).toHaveBeenCalledWith("abc-456");
  });

  it("削除ボタンにaria-labelが設定されている", () => {
    const todo = makeTodo();
    render(<TodoItem todo={todo} onToggle={vi.fn()} onDelete={vi.fn()} />);

    const deleteButton = screen.getByRole("button", { name: "削除" });
    expect(deleteButton).toBeInTheDocument();
  });
});
