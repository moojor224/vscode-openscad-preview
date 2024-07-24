import * as vscode from "vscode";
import * as path from "path";
import * as fs from "fs";

function btoa(str: string) {
    return Buffer.from(str).toString('base64');
}

function generateHTML(webview: vscode.WebviewPanel, context: vscode.ExtensionContext) {
    let p = context.asAbsolutePath("./src/openscad/index.html");
    let html = fs.readFileSync(p).toString();
    return html.replaceAll(/<resource>(.*?)<\/resource>(?!":)/g, function (match, ...groups) {
        groups.pop();
        groups.pop();
        let [link] = groups;
        // @ts-ignore
        return webview.webview.asWebviewUri(vscode.Uri.file(path.join(context.extensionPath, link))).toString();
    });
}

function updateWebview(webview: vscode.WebviewPanel, code: string) {
    webview.webview.postMessage({
        command: "injectCode",
        code: btoa(code),
    });
}

let curView: vscode.WebviewPanel | undefined = undefined;
let lastText = "";

export function activate(context: vscode.ExtensionContext) {
    vscode.window.onDidChangeActiveTextEditor((editor) => {
        if (editor && editor.document.fileName.endsWith(".scad")) {
            let code = editor.document.getText();
            if (curView !== undefined && code !== lastText) {
                lastText = code;
                vscode.window.showInformationMessage("updating scad preview");
                updateWebview(curView, code);
            }
        }
    });
    vscode.workspace.onDidSaveTextDocument((doc) => {
        if (doc.fileName.endsWith(".scad")) {
            let code = doc.getText();
            if (curView !== undefined && code !== lastText) {
                lastText = code;
                vscode.window.showInformationMessage("updating scad preview");
                updateWebview(curView, code);
            }
        }
    });
   
    let preview = vscode.commands.registerCommand("vscode-openscad-preview.preview", function (editor: vscode.TextEditor, edit: vscode.TextEditorEdit) {
        let currentFile = vscode.window.activeTextEditor;
        if (currentFile) {
            let code = currentFile.document.getText();
            if (curView !== undefined) {
                updateWebview(curView, code);
            }
            const webview = vscode.window.createWebviewPanel("openscadPreview", "OpenSCAD Preview", vscode.ViewColumn.Two, {
                enableScripts: true,
            });
            webview.onDidDispose(() => {
                curView = undefined;
            });
            webview.webview.html = generateHTML(webview, context);
            updateWebview(webview, code);
            lastText = code;
            curView = webview;
        }
    });

    context.subscriptions.push(preview);
}

export function deactivate() { }
