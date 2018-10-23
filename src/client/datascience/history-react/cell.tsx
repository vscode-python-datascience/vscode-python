// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.
'use strict';
import 'prismjs/themes/prism.css';
import './cell.css';

import { nbformat } from '@jupyterlab/coreutils';
import ansiToHtml from 'ansi-to-html';
import * as Prism from 'prismjs';
import * as React from 'react';
// tslint:disable-next-line:match-default-export-name import-name
import JSONTree from 'react-json-tree';

import { getLocString } from '../react-common/locReactSide';
import { RelativeImage } from '../react-common/relativeImage';
import { CellState, ICell } from '../types';
import { CellButton } from './cellButton';
import { CollapseButton } from './collapseButton';
import { ExecutionCount } from './executionCount';
import { MenuBar } from './menuBar';
import { displayOrder, richestMimetype, transforms } from './transforms';

// Borrowed this from the prism stuff. Simpler than trying to
// get loadLanguages to behave with webpack. Does mean we might get out of date though.
const pythonGrammar = {
    // tslint:disable-next-line:object-literal-key-quotes
    'comment': {
        pattern: /(^|[^\\])#.*/,
        lookbehind: true
    },
    // tslint:disable-next-line:object-literal-key-quotes
    'triple-quoted-string': {
        pattern: /("""|''')[\s\S]+?\1/,
        greedy: true,
        alias: 'string'
    },
    // tslint:disable-next-line:object-literal-key-quotes
    'string': {
        pattern: /("|')(?:\\.|(?!\1)[^\\\r\n])*\1/,
        greedy: true
    },
    // tslint:disable-next-line:object-literal-key-quotes
    'function': {
        pattern: /((?:^|\s)def[ \t]+)[a-zA-Z_]\w*(?=\s*\()/g,
        lookbehind: true
    },
    // tslint:disable-next-line:object-literal-key-quotes
    'class-name': {
        pattern: /(\bclass\s+)\w+/i,
        lookbehind: true
    },
    // tslint:disable-next-line:object-literal-key-quotes
    'keyword': /\b(?:as|assert|async|await|break|class|continue|def|del|elif|else|except|exec|finally|for|from|global|if|import|in|is|lambda|nonlocal|pass|print|raise|return|try|while|with|yield)\b/,
    // tslint:disable-next-line:object-literal-key-quotes
    'builtin': /\b(?:__import__|abs|all|any|apply|ascii|basestring|bin|bool|buffer|bytearray|bytes|callable|chr|classmethod|cmp|coerce|compile|complex|delattr|dict|dir|divmod|enumerate|eval|execfile|file|filter|float|format|frozenset|getattr|globals|hasattr|hash|help|hex|id|input|int|intern|isinstance|issubclass|iter|len|list|locals|long|map|max|memoryview|min|next|object|oct|open|ord|pow|property|range|raw_input|reduce|reload|repr|reversed|round|set|setattr|slice|sorted|staticmethod|str|sum|super|tuple|type|unichr|unicode|vars|xrange|zip)\b/,
    // tslint:disable-next-line:object-literal-key-quotes
    'boolean': /\b(?:True|False|None)\b/,
    // tslint:disable-next-line:object-literal-key-quotes
    'number': /(?:\b(?=\d)|\B(?=\.))(?:0[bo])?(?:(?:\d|0x[\da-f])[\da-f]*\.?\d*|\.\d+)(?:e[+-]?\d+)?j?\b/i,
    // tslint:disable-next-line:object-literal-key-quotes
    'operator': /[-+%=]=?|!=|\*\*?=?|\/\/?=?|<[<=>]?|>[=>]?|[&|^~]|\b(?:or|and|not)\b/,
    // tslint:disable-next-line:object-literal-key-quotes
    'punctuation': /[{}[\];(),.:]/
};

interface ICellProps {
    cellVM: ICellViewModel;
    theme: string;
    gotoCode(): void;
    delete(): void;
}

export interface ICellViewModel {
    cell: ICell;
    inputBlockOpen: boolean;
    inputBlockText: string;
    inputBlockCollapseNeeded: boolean;
    inputBlockToggled(id: string): void;
}

export class Cell extends React.Component<ICellProps> {
    constructor(prop: ICellProps) {
        super(prop);
    }

    public static concatMultilineString(str : nbformat.MultilineString) : string {
        if (Array.isArray(str)) {
            let result = '';
            for (let i = 0; i < str.length; i += 1) {
                const s = str[i];
                if (i < str.length - 1 && !s.endsWith('\n')) {
                    result = result.concat(`${s}\n`);
                } else {
                    result = result.concat(s);
                }
            }
            return result;
        }
        return str.toString();
    }

    public render() {
        const clearButtonImage = this.props.theme !== 'vscode-dark' ? './images/Cancel/Cancel_16xMD_vscode.svg' :
            './images/Cancel/Cancel_16xMD_vscode_dark.svg';
        const gotoSourceImage = this.props.theme !== 'vscode-dark' ? './images/GoToSourceCode/GoToSourceCode_16x_vscode.svg' :
            './images/GoToSourceCode/GoToSourceCode_16x_vscode_dark.svg';

        return (
            <div className='cell-wrapper'>
                <MenuBar theme={this.props.theme}>
                    <CellButton theme={this.props.theme} onClick={this.props.delete} tooltip={this.getDeleteString()}>
                        <RelativeImage class='cell-button-image' path={clearButtonImage} />
                    </CellButton>
                    <CellButton theme={this.props.theme} onClick={this.props.gotoCode} tooltip={this.getGoToCodeString()}>
                        <RelativeImage class='cell-button-image' path={gotoSourceImage} />
                    </CellButton>
                </MenuBar>
                <div className='cell-outer'>
                    <div className='controls-div'>
                        <div className='controls-flex'>
                            <ExecutionCount cell={this.props.cellVM.cell} theme={this.props.theme} visible={this.isCodeCell()}/>
                            <CollapseButton theme={this.props.theme} hidden={this.props.cellVM.inputBlockCollapseNeeded}
                                open={this.props.cellVM.inputBlockOpen} onClick={this.toggleInputBlock}
                                tooltip={getLocString('DataScience.collapseInputTooltip', 'Collapse input block')}/>
                        </div>
                    </div>
                    <div className='content-div'>
                        <div className='cell-result-container'>
                            {this.renderInputs()}
                            {this.renderResults()}
                        </div>
                    </div>
                </div>
            </div>
        );
    }

    // Public for testing
    public getUnknownMimeTypeString = () => {
        return getLocString('DataScience.unknownMimeType', 'Unknown Mime Type');
    }

    private toggleInputBlock = () => {
        const cellId: string = this.getCell().id;
        this.props.cellVM.inputBlockToggled(cellId);
    }

    private getDeleteString = () => {
        return getLocString('DataScience.deleteButtonTooltip', 'Delete');
    }

    private getGoToCodeString = () => {
        return getLocString('DataScience.gotoCodeButtonTooltip', 'Go to code');
    }

    private getCell = () => {
        return this.props.cellVM.cell;
    }

    private isCodeCell = () => {
        return this.props.cellVM.cell.data.cell_type === 'code';
    }

    private getCodeCell = () => {
        return this.props.cellVM.cell.data as nbformat.ICodeCell;
    }

    private getMarkdownCell = () => {
        return this.props.cellVM.cell.data as nbformat.IMarkdownCell;
    }

    private renderInputs = () => {
        if (this.isCodeCell()) {
            // Colorize our text
            const colorized = Prism.highlight(this.props.cellVM.inputBlockText, pythonGrammar);
            const Transform = transforms['text/html'];
            return <div className='cell-input'><Transform data={colorized}/></div>;
        }
    }

    private renderResults = () => {
        const outputClassNames = this.isCodeCell() ?
            `cell-output cell-output-${this.props.theme}` :
            '';

        // Results depend upon the type of cell
        const results = this.isCodeCell() ?
            this.renderCodeOutputs() :
            this.renderMarkdown(this.getMarkdownCell());

        // Then combine them inside a div
        return <div className={outputClassNames}>{results}</div>;
    }
    private renderCodeOutputs = () => {
        if (this.isCodeCell() &&
            (this.getCell().state === CellState.finished || this.getCell().state === CellState.error)) {

            // Render the outputs
            return this.getCodeCell().outputs.map((output: nbformat.IOutput, index: number) => {
                return this.renderOutput(output, index);
            });

        }
    }

    private renderMarkdown = (markdown : nbformat.IMarkdownCell) => {
        // React-markdown expects that the source is a string
        const source = Cell.concatMultilineString(markdown.source);
        const Transform = transforms['text/markdown'];

        return <Transform data={source}/>;
    }

    private renderWithTransform = (mimetype: string, output : nbformat.IOutput, index : number) => {

        // If we found a mimetype, use the transform
        if (mimetype) {

            // Get the matching React.Component for that mimetype
            const Transform = transforms[mimetype];

            if (typeof mimetype !== 'string') {
                return <div key={index}>{this.getUnknownMimeTypeString()}</div>;
            }

            try {
                // Text/plain has to be massaged. It expects a continuous string
                if (output.data) {
                    let data = output.data[mimetype];
                    if (mimetype === 'text/plain') {
                        data = Cell.concatMultilineString(data);
                    }

                    // Return the transformed control using the data we massaged
                    return <Transform key={index} data={data} />;
                }
            } catch (ex) {
                window.console.log('Error in rendering');
                window.console.log(ex);
                return <div></div>;
            }
        }

        return <div></div>;
    }

    private renderOutput = (output : nbformat.IOutput, index: number) => {
        // Borrowed this from Don's Jupyter extension

        // First make sure we have the mime data
        if (!output) {
          return <div key={index}/>;
        }

        // Make a copy of our data so we don't modify our cell
        const copy = {...output};

        // Special case for json
        if (copy.data && copy.data['application/json']) {
          return <JSONTree key={index} data={copy.data} />;
        }

        // Stream and error output need to be converted
        if (copy.output_type === 'stream') {
            const stream = copy as nbformat.IStream;
            const text = Cell.concatMultilineString(stream.text);
            copy.data = {
                'text/html' : text
            };
        } else if (copy.output_type === 'error') {
            const error = copy as nbformat.IError;
            const converter = new ansiToHtml();
            const trace = converter.toHtml(error.traceback.join('\n'));
            copy.data = {
                'text/html' : trace
            };
        }

        // Jupyter style MIME bundle

        // Find out which mimetype is the richest
        const mimetype: string = richestMimetype(copy.data, displayOrder, transforms);

        // If that worked, use the transform
        if (mimetype) {
            return this.renderWithTransform(mimetype, copy, index);
        }

        const str : string = this.getUnknownMimeTypeString();
        return <div key={index}>${str}</div>;
    }
}
