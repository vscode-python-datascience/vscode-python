// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.

'use strict';

import { displayOrder, richestMimetype, transforms  } from './transforms';

import * as React from 'react';
// tslint:disable-next-line:match-default-export-name import-name
import JSONTree from 'react-json-tree';

import { getLocString } from '../react-common/locReactSide';
import { RelativeImage } from '../react-common/relativeImage';
import { ICell } from '../types';
import './cell.css';
import { CellButton } from './cellButton';
import { MenuBar } from './menuBar';

interface ICellProps {
    cell : ICell;
    theme: string;
    gotoCode() : void;
    delete() : void;
}

export class Cell extends React.Component<ICellProps> {

    constructor(prop: ICellProps) {
        super(prop);
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
                        <RelativeImage class='cell-button-image' path={clearButtonImage}/>
                    </CellButton>
                    <CellButton theme={this.props.theme} onClick={this.props.gotoCode} tooltip={this.getGoToCodeString()}>
                        <RelativeImage class='cell-button-image' path={gotoSourceImage}/>
                    </CellButton>
                </MenuBar>
                <div className='cell-outer'>
                    <div className='cell-execution-count'>{`[${this.props.cell.executionCount}]:`}</div>
                    <div className='cell-result-container'>
                        <div className='cell-input'>{this.props.cell.input}</div>
                        <div className={outputClassNames}>{this.renderOutput()}</div>
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

    private renderWithTransform = (mimetype: string, cell: ICell) => {

        // If we found a mimetype, use the transform
        if (mimetype) {

            // Get the matching React.Component for that mimetype
            const Transform = transforms[mimetype];

            if (typeof mimetype !== 'string') {
                return <div>{this.getUnknownMimeTypeString()}</div>;
            }

            try {
                return <Transform data={cell.output[mimetype]}/>;
            } catch (ex) {
                window.console.log('Error in rendering');
                window.console.log(ex);
                return <div></div>;
            }
        }

        return <div></div>;
    }

    private renderOutput = () => {

        // Borrowed this from Don's Jupyter extension
        const cell = this.props.cell;

        // First make sure we have the mime data
        if (!cell || !cell.output) {
          return <div />;
        }

        // Special case for json
        if (cell.output['application/json']) {
          return <JSONTree data={cell.output} />;
        }

        // Jupyter style MIME bundle

        // Find out which mimetype is the richest
        const mimetype: string = richestMimetype(cell.output, displayOrder, transforms);

        // If that worked, use the transform
        if (mimetype) {
            return this.renderWithTransform(mimetype, cell);
        }

        const str : string = this.getUnknownMimeTypeString();
        return <div>${str}</div>;
    }
}
