// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.

'use strict';

import { displayOrder, richestMimetype, transforms } from './transforms';

import * as React from 'react';
// tslint:disable-next-line:match-default-export-name import-name
import JSONTree from 'react-json-tree';

import { nbformat } from '@jupyterlab/coreutils';
import { getLocString } from '../react-common/locReactSide';
import { RelativeImage } from '../react-common/relativeImage';
import { ICell } from '../types';
import './cell.css';
import { CellButton } from './cellButton';
import { MenuBar } from './menuBar';
import { strictEqual } from 'assert';

interface ICellProps {
    cell: ICell;
    theme: string;
    gotoCode(): void;
    delete(): void;
}

interface ICellState {
    inputBlockOpen: boolean;
    inputBlockText: string;
    inputBlockCollapseNeeded: boolean;
}

export class Cell extends React.Component<ICellProps, ICellState> {

    constructor(prop: ICellProps) {
        super(prop);

        let inputLinesCount = 0;

        // Don't show our collapses if the input block is just one line
        const inputText = this.extractInputText();
        if (inputText) {
            inputLinesCount = inputText.split('\n').length;
        }

        // Initial state of our cell toggle
        this.state = { inputBlockOpen: true,
                       inputBlockText: inputText,
                       inputBlockCollapseNeeded : inputLinesCount > 1 };
    }

    public render() {
        const outputClassNames = `cell-output cell-output-${this.props.theme}`;
        const collapseInputPolygonClassNames = `collapse-input-svg ${this.state.inputBlockOpen ? ' collapse-input-svg-rotate' : ''} collapse-input-svg-${this.props.theme}`;
        const collapseInputClassNames = `collapse-input remove-style ${this.state.inputBlockCollapseNeeded ? '' : ' hide'}`;
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
                            <div className='cell-execution-count'>{`[${this.props.cell.execution_count}]:`}</div>
                            <button className={collapseInputClassNames} onClick={this.toggleInputBlock}>
                                <svg version='1.1' baseProfile='full' width='8px' height='11px'>
                                    <polygon points='0,0 0,10 5,5' className={collapseInputPolygonClassNames} fill='black' />
                                </svg>
                            </button>
                        </div>
                    </div>
                    <div className='content-div'>
                        <div className='cell-result-container'>
                            <div className='cell-input'>{this.state.inputBlockText}</div>
                            <div className={outputClassNames}>
                                {this.renderOutputs()}
                            </div>
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

    private getDeleteString = () => {
        return getLocString('DataScience.deleteButtonTooltip', 'Delete');
    }

    private getGoToCodeString = () => {
        return getLocString('DataScience.gotoCodeButtonTooltip', 'Go to code');
    }

    private concatMultilineString(str : nbformat.MultilineString) : string {
        if (Array.isArray(str)) {
            let result = '';
            for (let i=0; i<str.length; i++) {
                const s = str[i];
                if (i < str.length - 1 && !s.endsWith('\n')) {
                    result = result.concat(`${s}\n`)
                } else {
                    result = result.concat(s);
                }
            }
            return result;
        }
        return str.toString();
    }

    private extractInputText = () => {
        return this.concatMultilineString(this.props.cell.source);
    }

    private renderOutputs = () => {
        return this.props.cell.outputs.map((output : nbformat.IOutput, index : number) => {
            return this.renderOutput(output, index);
        });
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
                        data = this.concatMultilineString(data);
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

    private toggleInputBlock = () => {
        const newState = !this.state.inputBlockOpen;
        let newText = this.extractInputText();
        // Set our input text based on the new state
        if (!newState) {
          if (newText.length > 0) {
            newText = newText.split('\n', 1)[0];
            newText = newText.slice(0, 255); // Slice to limit length of string, slicing past the string length is fine
            newText = newText.concat('...');
          }
        }
        this.setState({
            inputBlockOpen: newState,
            inputBlockText: newText
        });
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
            const text = this.concatMultilineString(stream.text);
            copy.data = {
                'text/html' : text
            };
        } else if (copy.output_type === 'error') {
            const error = copy as nbformat.IError;
            copy.data = {
                'text/html' : [error.evalue, ...error.traceback]
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
