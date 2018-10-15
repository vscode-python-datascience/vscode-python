// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.

'use strict';

import { richestMimetype, standardDisplayOrder, standardTransforms } from '@nteract/transforms';
import * as React from 'react';
// tslint:disable-next-line:match-default-export-name import-name
import JSONTree from 'react-json-tree';

import { ICell } from '../types';
import './cell.css';

export class Cell extends React.Component<ICell, {inputBlockOpen: boolean}> {
    constructor(prop: ICell) {
        super(prop);

        // Initial state of our cell toggle
        this.state = { inputBlockOpen: false };
    }

    public render() {
        return (
            <div className='cell-outer'>
              <div className='controls-div'>
                <button className='remove-style' onClick={this.toggleInputBlock}>
                  <img className={(this.state.inputBlockOpen ? ' hide' : 'center-img')} src='expandArrowRotate.svg' />
                  <img className={(this.state.inputBlockOpen ? 'center-img' : ' hide')} src='expandArrow.svg' />
                </button>
              </div>
              <div className='content-div'>
                <div className={'cell-input' + (this.state.inputBlockOpen ? ' hide' : '')}>
                  <div className='cell-input-text'>{this.props.input}</div>
                </div>
                <div className='cell-output'>{this.renderOutput()}</div>
              </div>
              <div className='clear-floats'></div>
            </div>
        );
    }

    private toggleInputBlock = () => {
      this.setState({
        inputBlockOpen: !this.state.inputBlockOpen
      });
    }

    private renderOutput() {

        // Borrowed this from Don's Jupyter extension
        const cell = this.props;

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
        const mimetype: string = richestMimetype(cell.output, standardDisplayOrder, standardTransforms);

        // Get the matching React.Component for that mimetype
        const Transform = standardTransforms[mimetype];

        if (typeof mimetype !== 'string') {
          return <div>Unknown Mime Type</div>;
        }
        // If dealing with images, set the background color to white
        const style: React.CSSProperties = {};
        if (mimetype.startsWith('image')) {
          style.backgroundColor = 'white';
        }
        if (mimetype === 'text/plain') {
          style.whiteSpace = 'pre';
        }
        try {
          return <div style={style}><Transform data={cell.output[mimetype]} /></div>;
        } catch (ex) {
          window.console.log('Error in rendering');
          window.console.log(ex);
          return <div></div>;
        }

    }
}
