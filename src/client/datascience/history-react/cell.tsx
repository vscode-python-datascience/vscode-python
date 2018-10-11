// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.

'use strict';

import { displayOrder, richestMimetype, transforms  } from './transforms';

import * as React from 'react';
// tslint:disable-next-line:match-default-export-name import-name
import JSONTree from 'react-json-tree';

import { ILocalizableProps } from '../react-common/locReactSide';
import { ICell } from '../types';
import './cell.css';

interface ICellProps extends ILocalizableProps {
    cell : ICell;
}

interface ICellState {
    unknownMimeType : string | undefined;
}

export class Cell extends React.Component<ICellProps, ICellState> {

    constructor(prop: ICellProps) {
        super(prop);
        this.state = { unknownMimeType : undefined };
    }

    public componentDidMount() {
        // Call async function when we get our props and we know we're loaded
        this.props.getLocalized('DataScience.unknownMimeType').then((v : string) => {
            this.setState({unknownMimeType : v});
        }).catch((e) => this.setState({unknownMimeType : e}));
    }

    public render() {
        return (
            <div className='cell-outer'>
                <div className='cell-input'>{this.props.cell.input}</div>
                <div className='cell-output'>{this.renderOutput()}</div>
            </div>
        );
    }

    private renderWithTransform = (mimetype: string, cell: ICell) => {

        // If we found a mimetype, use the transform
        if (mimetype) {

            // Get the matching React.Component for that mimetype
            const Transform = transforms[mimetype];

            if (typeof mimetype !== 'string') {
                return <div>{this.getUnknownMimeTypeString()}</div>;
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

        return <div></div>;
    }

    private getUnknownMimeTypeString = () => {
        return this.state.unknownMimeType ? this.state.unknownMimeType : 'Unknown mime type';
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
