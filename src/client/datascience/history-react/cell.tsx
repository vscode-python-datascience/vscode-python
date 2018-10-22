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
import { CollapseButton } from './collapseButton';
import { ExecutionCount } from './executionCount';
import { MenuBar } from './menuBar';

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
        const outputClassNames = `cell-output cell-output-${this.props.theme}`;
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
                            <ExecutionCount cell={this.props.cellVM.cell} theme={this.props.theme} />
                            <CollapseButton theme={this.props.theme} hidden={this.props.cellVM.inputBlockCollapseNeeded}
                                open={this.props.cellVM.inputBlockOpen} onClick={this.toggleInputBlock}
                                tooltip={getLocString('DataScience.collapseInputTooltip', 'Collapse input block')}/>
                        </div>
                    </div>
                    <div className='content-div'>
                        <div className='cell-result-container'>
                            <div className='cell-input'>{this.props.cellVM.inputBlockText}</div>
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

    private toggleInputBlock = () => {
        const cellId: string = this.props.cellVM.cell.id;
        this.props.cellVM.inputBlockToggled(cellId);
    }

    private getDeleteString = () => {
        return getLocString('DataScience.deleteButtonTooltip', 'Delete');
    }

    private getGoToCodeString = () => {
        return getLocString('DataScience.gotoCodeButtonTooltip', 'Go to code');
    }

    private renderOutputs = () => {
        return this.props.cellVM.cell.outputs.map((output : nbformat.IOutput, index : number) => {
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
