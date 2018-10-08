// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.

'use strict';
import * as React from 'react';

interface IErrorState {
    hasError: boolean;
    errorMessage: string;
}


export class ErrorBoundary extends React.Component<{}, IErrorState> {
    constructor(props) {
        super(props);
        this.state = { hasError: false, errorMessage: '' };
    }

    componentDidCatch(error, info) {
        const stack = info.componentStack;

        // Display fallback UI
        this.setState({ hasError: true, errorMessage: `${error} at \n  ${stack}`});
    }

    render() {
        if (this.state.hasError) {
            // Render our error message;
            let style = {};
            style['white-space'] = 'pre';

            return <h1 style={style}>{this.state.errorMessage}</h1>;
        }
        return this.props.children;
    }

}
