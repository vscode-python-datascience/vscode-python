// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.

'use strict';
import * as React from 'react';
import './cellButton.css';

interface ICellButtonProps {
    theme: string;
    tooltip : string;
    onClick() : void;
}

export class CellButton extends React.Component<ICellButtonProps> {
    constructor(props) {
        super(props);
        this.state = { hover: false };
    }

    public render() {
        const classNames = `cell-button cell-button-${this.props.theme}`;

        return (
            <div role='button' aria-pressed='false' title={this.props.tooltip} className={classNames} onClick={this.props.onClick}>
                <div className='cell-button-child'>
                    {this.props.children}
                </div>
            </div>);
    }

}
