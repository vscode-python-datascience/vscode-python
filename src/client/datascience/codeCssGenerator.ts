// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.
'use strict';
import { JSONArray, JSONObject, JSONValue } from '@phosphor/coreutils';
import * as fm from 'file-matcher';
import * as fs from 'fs-extra';
import * as path from 'path';

import { IWorkspaceService } from '../common/application/types';
import { ICurrentProcess, ILogger } from '../common/types';
import { IServiceContainer } from '../ioc/types';

// This class generates css using the current theme in order to colorize code.
//
// NOTE: This is all a big hack. It's relying on the theme json files to have a certain format
// in order for this to work
export class CodeCssGenerator {
    private workspaceService : IWorkspaceService;
    private currentProcess : ICurrentProcess;
    private logger : ILogger;

    constructor(serviceContainer: IServiceContainer) {
        this.workspaceService = serviceContainer.get<IWorkspaceService>(IWorkspaceService);
        this.currentProcess = serviceContainer.get<ICurrentProcess>(ICurrentProcess);
        this.logger = serviceContainer.get<ILogger>(ILogger);
    }

    public generateThemeCss = async () : Promise<string> => {
        // First compute our current theme.
        const workbench = this.workspaceService.getConfiguration('workbench');
        const theme = workbench.get<string>('colorTheme');
        const editor = this.workspaceService.getConfiguration('editor', undefined);
        const font = editor.get<string>('fontFamily');
        const fontSize = editor.get<number>('fontSize');

        // Then we have to find where the theme resources are loaded from
        try {
            if (theme) {
                const tokens = await this.findTokensJson(theme);

                // The tokens object then contains the necessary data to generate our css
                if (tokens && font && fontSize) {
                    return this.generateCss(tokens, font, fontSize);
                }
            }
        } catch (err) {
            // On error don't fail, just log
            this.logger.logError(err);
        }

        return '';
    }

    private getScopeColor = (tokenColors: JSONArray, scope: string) : string => {
        // Search through the scopes on the json object
        const match = tokenColors.findIndex(entry => {
            const scopes = entry['scope'] as JSONValue;
            if (Array.isArray(scopes)) {
                if (scopes.find((v : JSONValue) => v.toString() === scope)) {
                    return true;
                }
            } else if (scopes.toString() === scope) {
                return true;
            }

            return false;
        });
        if (match >= 0) {
            return tokenColors[match]['settings']['foreground'];
        }

        // Default to editor foreground
        return 'var(--vscode-editor-foreground)';
    }

    // tslint:disable-next-line:max-func-body-length
    private generateCss = (tokens : JSONObject, fontFamily : string, fontSize: number) : string => {
        const tokenColors = tokens['tokenColors'] as JSONArray;

        // There's a set of values that need to be found
        const comment = this.getScopeColor(tokenColors, 'comment');
        const numeric = this.getScopeColor(tokenColors, 'constant.numeric');
        const stringColor = this.getScopeColor(tokenColors, 'string');
        const keyword = this.getScopeColor(tokenColors, 'keyword');
        const operator = this.getScopeColor(tokenColors, 'keyword.operator');
        const def = 'var(--vscode-editor-foreground)';

        // Use these values to fill in our format string
        return `
        code[class*="language-"],
        pre[class*="language-"] {
            color: ${def};
            background: none;
            text-shadow: 0 1px white;
            font-family: ${fontFamily};
            text-align: left;
            white-space: pre;
            word-spacing: normal;
            word-break: normal;
            word-wrap: normal;
            font-size: ${fontSize}px;

            -moz-tab-size: 4;
            -o-tab-size: 4;
            tab-size: 4;

            -webkit-hyphens: none;
            -moz-hyphens: none;
            -ms-hyphens: none;
            hyphens: none;
        }

        pre[class*="language-"]::-moz-selection, pre[class*="language-"] ::-moz-selection,
        code[class*="language-"]::-moz-selection, code[class*="language-"] ::-moz-selection {
            text-shadow: none;
            background: var(--vscode-editor-selectionBackground);
        }

        pre[class*="language-"]::selection, pre[class*="language-"] ::selection,
        code[class*="language-"]::selection, code[class*="language-"] ::selection {
            text-shadow: none;
            background: var(--vscode-editor-selectionBackground);
        }

        @media print {
            code[class*="language-"],
            pre[class*="language-"] {
                text-shadow: none;
            }
        }

        /* Code blocks */
        pre[class*="language-"] {
            padding: 1em;
            margin: .5em 0;
            overflow: auto;
        }

        :not(pre) > code[class*="language-"],
        pre[class*="language-"] {
            background: transparent;
        }

        /* Inline code */
        :not(pre) > code[class*="language-"] {
            padding: .1em;
            border-radius: .3em;
            white-space: normal;
        }

        .token.comment,
        .token.prolog,
        .token.doctype,
        .token.cdata {
            color: ${comment};
        }

        .token.punctuation {
            color: ${def};
        }

        .namespace {
            opacity: .7;
        }

        .token.property,
        .token.tag,
        .token.boolean,
        .token.number,
        .token.constant,
        .token.symbol,
        .token.deleted {
            color: ${numeric};
        }

        .token.selector,
        .token.attr-name,
        .token.string,
        .token.char,
        .token.builtin,
        .token.inserted {
            color: ${stringColor};
        }

        .token.operator,
        .token.entity,
        .token.url,
        .language-css .token.string,
        .style .token.string {
            color: ${operator};
            background: transparent;
        }

        .token.atrule,
        .token.attr-value,
        .token.keyword {
            color: ${keyword};
        }

        .token.function,
        .token.class-name {
            color: ${keyword};
        }

        .token.regex,
        .token.important,
        .token.variable {
            color: ${def};
        }

        .token.important,
        .token.bold {
            font-weight: bold;
        }
        .token.italic {
            font-style: italic;
        }

        .token.entity {
            cursor: help;
        }
`;

    }

    private findTokensJson = async (theme : string) : Promise<JSONObject | undefined> => {
        const currentExe = this.currentProcess.execPath;
        const currentPath = path.dirname(currentExe);

        // Should be somewhere under currentPath/resources/app/extensions inside of a json file
        const extensionsPath = path.join(currentPath, 'resources', 'app', 'extensions');

        // Search through all of the json files for the theme name
        const searchOptions : fm.FindOptions = {
            path: extensionsPath,
            recursiveSearch: true,
            fileFilter : {
                fileNamePattern : '**/*.json',
                content: new RegExp(`id[',"]:\\s*[',"]${theme}[',"]`)
            }
        };

        const matcher = new fm.FileMatcher();
        const results = await matcher.find(searchOptions);

        // Use the first result if we have one
        if (results && results.length > 0) {
            // This should be the path to the file. Load it as a json object
            const contents = await fs.readFile(results[0], 'utf8');
            const json = JSON.parse(contents) as JSONObject;

            // There should be a contributes section
            const contributes = json['contributes'] as JSONObject;

            // This should have a themes section
            const themes = contributes['themes'] as JSONArray;

            // One of these (it's an array), should have our matching theme entry
            const index = themes.findIndex((e: JSONObject) => {
                return e['id'] === theme;
            });

            if (index >= 0) {
                // Then the path entry should contain a relative path to the json file with
                // the tokens in it
                const themeFile = path.join(path.dirname(results[0]), themes[index]['path']);
                const tokenContent = await fs.readFile(themeFile, 'utf8');
                return JSON.parse(tokenContent) as JSONObject;
            }
        }

        return undefined;
    }
}
