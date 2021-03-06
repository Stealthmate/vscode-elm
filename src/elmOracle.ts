import * as cp from 'child_process';
import * as path from 'path';
import * as userProject from './elmUserProject';
import * as vscode from 'vscode';
import { askOracle } from './elmDelphi';
import { isWindows } from './elmUtils';

import { detectProjectRoot, pluginPath, detectProjectRootAndElmVersion } from './elmUtils';

export interface IOracleResult {
  name: string;
  fullName: string;
  href: string;
  signature: string;
  comment: string;
  kind?: vscode.CompletionItemKind;
}

export enum OracleAction {
  IsHover,
  IsAutocomplete,
}

const config = vscode.workspace.getConfiguration('elm');

let oraclePath =
  pluginPath +
  path.sep +
  'node_modules' +
  path.sep +
  'elm-oracle' +
  path.sep +
  'bin' +
  path.sep +
  'elm-oracle';

export function GetOracleResults(
  document: vscode.TextDocument,
  position: vscode.Position,
  action: OracleAction,
): Thenable<IOracleResult[]> {
  return new Promise((resolve: Function, reject: Function) => {
    let p: cp.ChildProcess;
    let filename: string = document.fileName;
    let [cwd, elmVersion] = detectProjectRootAndElmVersion(document.fileName, vscode.workspace.rootPath) || vscode.workspace.rootPath;
    let fn = path.relative(cwd, filename);
    let wordAtPosition = document.getWordRangeAtPosition(position);
    if (!wordAtPosition) {
      return resolve(null);
    }
    let currentWord: string = document.getText(wordAtPosition);

    if (elmVersion === '0.18') {

      p = cp.execFile(
        'node',
        [oraclePath, fn, currentWord],
        { cwd: cwd },
        (err: Error, stdout: string, stderr: string) => {
          try {
            if (err) {
              return resolve(null);
            }

            const result: IOracleResult[] = [
              ...JSON.parse(stdout),
              ...(config['userProjectIntellisense']
                ? userProject.userProject(document, position, currentWord, action)
                : []),
            ];
            resolve(result);
          } catch (e) {
            reject(e);
          }
        },
      );
    } else if (elmVersion === '0.19') {
      try {
        const result: IOracleResult[] = [
          ...askOracle(isWindows, cwd, fn, currentWord),
          ...(config['userProjectIntellisense']
            ? userProject.userProject(document, position, currentWord, action)
            : []),
        ];
        resolve(result);
      } catch (e) {
        reject(e);
      }
    } else {
      try {
        const result: IOracleResult[] = [
          ...(config['userProjectIntellisense']
            ? userProject.userProject(document, position, currentWord, action)
            : []),
        ];
        resolve(result);
      } catch (e) {
        reject(e);
      }
    }
  });
}
