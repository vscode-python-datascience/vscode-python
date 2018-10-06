// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.

'use strict';
import * as React from 'react';
import { ICell } from '../types';
import './cell.css';


export class Cell extends React.Component<ICell> {
    constructor(prop: ICell) {
        super(prop);
    }

    public render() {
        return (
            <div className='cell-outer'>
                <div className='cell-input'>{this.props.input}</div>
                <div className='cell-output'>{this.props.output}</div>
            </div>
        );
    }
}
