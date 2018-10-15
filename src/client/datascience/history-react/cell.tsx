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

interface ICellState {
    inputBlockOpen: boolean;
    inputBlockText: string;
}

export class Cell extends React.Component<ICellProps, ICellState> {

    constructor(prop: ICellProps) {
        super(prop);

        // Initial state of our cell toggle
        this.state = { inputBlockOpen: true,
                       inputBlockText: prop.cell.input };
    }

    public render() {
        const outputClassNames = `cell-output cell-output-${this.props.theme}`;
        const collapseInputClassNames = `collapse-input-svg ${this.state.inputBlockOpen ? ' collapse-input-svg-rotate' : ''} collapse-input-svg-${this.props.theme}`;
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
                  <div className='controls-div'>
                    <div className='controls-flex'>
                        <div className='cell-execution-count'>{`[${this.props.cell.executionCount}]:`}</div>
                            <button className='collapse-input remove-style' onClick={this.toggleInputBlock}>
                                <svg version='1.1' baseProfile='full' width='8px' height='11px'>
                                    <polygon points='0,0 0,10 5,5' className={collapseInputClassNames} fill='black'/>
                                </svg>
                            </button>
                    </div>
                  </div>
                  <div className='content-div'>
                    <div className='cell-result-container'>
                        <div className='cell-input'>{this.state.inputBlockText}</div>
                        <div className={outputClassNames}>{this.renderOutput()}</div>
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

    private toggleInputBlock = () => {
        const newState = !this.state.inputBlockOpen;
        let newText = '';
        // Set our input text based on the new state
        if (newState) {
          newText = this.props.cell.input;
        } else {
          if (this.props.cell.input.length > 0) {
            newText = this.props.cell.input.split('\n', 1)[0];
            newText = newText.slice(0, 255); // Slice to limit length of string, slicing past the string length is fine
            newText = newText.concat('...');
          }
        }
        this.setState({
          inputBlockOpen: newState,
          inputBlockText: newText
        });
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
