const vscode = require("vscode");
const fs = require("fs");

// Get configuration values
let backgroundColor = vscode.workspace
  .getConfiguration()
  .get("simple-todo-list.backgroundColor");

let useStrikeThrough = vscode.workspace
  .getConfiguration()
  .get("simple-todo-list.useStrikeThrough");

let textDecorationType = vscode.window.createTextEditorDecorationType({
  textDecoration: useStrikeThrough ? "line-through" : "none",
  backgroundColor: backgroundColor,
});

let clearDecorationType = vscode.window.createTextEditorDecorationType({
  textDecoration: "none",
  backgroundColor: null,
});

const updateDecorationType = () => {
  // Get the setting value
  const backgroundColor = vscode.workspace
    .getConfiguration()
    .get("simple-todo-list.backgroundColor");

  const useStrikeThrough = vscode.workspace
    .getConfiguration()
    .get("simple-todo-list.useStrikeThrough");

  // Update decoration type based on setting value
  textDecorationType.dispose(); // Dispose the old decoration type

  // Create the new decoration type with updated settings
  textDecorationType = vscode.window.createTextEditorDecorationType({
    textDecoration: useStrikeThrough ? "line-through" : "none",
    backgroundColor,
  });

  vscode.window.showInformationMessage("Simple TODO list settings updated");
};

const applyDecoration = (editor) => {
  if (editor.document.fileName.endsWith("TODO.md")) {
    const decorations = [];
    const document = editor.document;

    for (let i = 0; i < document.lineCount; i++) {
      const line = document.lineAt(i);
      const lineText = line.text;
      const startIndex = lineText.indexOf("- [x]");
      if (startIndex !== -1) {
        const range = new vscode.Range(
          line.range.start,
          line.range.start.translate(0, lineText.length)
        );
        decorations.push({
          range: range,
        });
      }
    }

    editor.setDecorations(textDecorationType, decorations);
  }
};

const removeDecoration = (editor) => {
  const emptyDecorations = []; // Empty array to remove decorations
  const document = editor.document;

  for (let i = 0; i < document.lineCount; i++) {
    const line = document.lineAt(i);
    const lineText = line.text;
    const startIndex = lineText.indexOf("- [ ]");

    if (startIndex !== -1) {
      const range = new vscode.Range(
        line.range.start,
        line.range.start.translate(0, lineText.length)
      );
      emptyDecorations.push({
        range: range,
      });
    }
  }

  editor.setDecorations(clearDecorationType, emptyDecorations);
  applyDecoration(editor);
};

const checkOpenEditors = () => {
  const editors = vscode.window.visibleTextEditors;
  for (const editor of editors) {
    if (editor.document.fileName.endsWith("TODO.md")) {
      applyDecoration(editor);
    }
  }
};

/**
 * @param {vscode.ExtensionContext} context
 */
function activate(context) {
  checkOpenEditors();

  let disposable = vscode.commands.registerCommand(
    "simple-todo-list.toggleTodo",
    () => {
      const editor = vscode.window.activeTextEditor;
      if (editor && editor.document.fileName.endsWith("TODO.md")) {
        const document = editor.document;
        const lineNumber = editor.selection.active.line;
        const line = document.lineAt(lineNumber);
        const lineText = line.text;
        const startIndex = lineText.indexOf("- [ ]");

        // Check if the todo item is unchecked ("- [ ]")
        if (startIndex !== -1) {
          const newText =
            lineText.substring(0, startIndex) +
            "- [x]" +
            lineText.substring(startIndex + 5);
          editor
            .edit((editBuilder) => {
              editBuilder.replace(line.range, newText);
            })
            .then((success) => {
              if (success) {
                applyDecoration(editor);
              } else {
              }
            });
        }
        // Check if the todo item is checked ("- [x]")
        else {
          const startIndexChecked = lineText.indexOf("- [x]");
          if (startIndexChecked !== -1) {
            const newText =
              lineText.substring(0, startIndexChecked) +
              "- [ ]" +
              lineText.substring(startIndexChecked + 5);
            editor
              .edit((editBuilder) => {
                editBuilder.replace(line.range, newText);
              })
              .then((success) => {
                if (success) {
                  // The edit operation was successful
                  removeDecoration(editor);
                } else {
                  // Handle failure to edit, if needed
                }
              });
          }
        }
      } else {
        vscode.window.showWarningMessage(
          "No active text editor found or TODO.md is not the active editor"
        );
      }
    }
  );

  let disposableAddItem = vscode.commands.registerCommand(
    "simple-todo-list.addTodoItem",
    () => {
      const editor = vscode.window.activeTextEditor;
      if (editor && editor.document.fileName.endsWith("TODO.md")) {
        const document = editor.document;
        const position = editor.selection.active;

        const currentLine = document.lineAt(position.line);

        const lineText = currentLine.text.trim();

        if (lineText.startsWith("- [ ]") || lineText.startsWith("- [x]")) {
          vscode.window.showWarningMessage(
            "Please move to a line without a TODO item"
          );
          return;
        }

        const newText = "- [ ] " + lineText;
        editor
          .edit((editBuilder) => {
            editBuilder.insert(position.with(undefined, 0), newText);
          })
          .then(() => {
            removeDecoration(editor);
            vscode.window.showInformationMessage("New todo item added");
          });

        vscode.window.showInformationMessage("New todo item added");
      } else {
        vscode.window.showWarningMessage(
          "No active text editor found or TODO.md is not the active editor"
        );
      }
    }
  );

  let disposableCreate = vscode.commands.registerCommand(
    "simple-todo-list.createTodoFile",
    () => {
      if (
        vscode.workspace.workspaceFolders &&
        vscode.workspace.workspaceFolders.length > 0
      ) {
        const workspaceFolder = vscode.workspace.workspaceFolders[0];
        const todoFilePath = vscode.Uri.joinPath(
          workspaceFolder.uri,
          "TODO.md"
        );

        fs.promises
          .access(todoFilePath.fsPath, fs.constants.F_OK)
          .then(() => {
            vscode.window.showInformationMessage("TODO.md file already exists");
            vscode.workspace
              .openTextDocument(todoFilePath)
              .then((document) => {
                vscode.window.showTextDocument(document);
              })
              .catch((err) => {
                vscode.window.showErrorMessage("Failed to open TODO.md file");
                console.error(err);
              });
          })
          .catch(() => {
            const content = "# TODO\n\n";
            fs.promises
              .writeFile(todoFilePath.fsPath, content)
              .then(() => {
                vscode.window.showInformationMessage(
                  "TODO.md file created successfully"
                );

                // Open the newly created file
                vscode.workspace
                  .openTextDocument(todoFilePath)
                  .then((document) => {
                    vscode.window.showTextDocument(document);
                  })
                  .catch((err) => {
                    vscode.window.showErrorMessage(
                      "Failed to open TODO.md file"
                    );
                    console.error(err);
                  });
              })
              .catch((err) => {
                vscode.window.showErrorMessage("Failed to create TODO.md file");
                console.error(err);
              });
          });
      } else {
        vscode.window.showWarningMessage("No workspace folder found");
      }
    }
  );

  vscode.window.onDidChangeActiveTextEditor((editor) => {
    if (editor) {
      applyDecoration(editor);
    }
  });

  vscode.window.onDidChangeVisibleTextEditors((editors) => {
    // Iterate over the visible text editors
    for (const editor of editors) {
      // Check if the opened file matches the desired file (e.g., "TODO.md")
      if (editor.document.fileName.endsWith("TODO.md")) {
        applyDecoration(editor);
      }
    }
  });

  context.subscriptions.push(disposable, disposableCreate, disposableAddItem);
}

// Watch for configuration changes
vscode.workspace.onDidChangeConfiguration((event) => {
  if (
    event.affectsConfiguration("simple-todo-list.backgroundColor") ||
    event.affectsConfiguration("simple-todo-list.useStrikeThrough")
  ) {
    updateDecorationType();
  }
});

// This method is called when your extension is deactivated
function deactivate() {}

module.exports = {
  activate,
  deactivate,
};
