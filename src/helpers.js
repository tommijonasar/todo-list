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
