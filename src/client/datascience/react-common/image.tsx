// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.

'use strict';
import * as path from 'path';
import * as React from 'react';

// This special function finds relative paths when loading inside of vscode. It's not defined
// when loading outside, so the Image component should still work.
export declare function resolvePath(relativePath: string): string;

interface IImageProps {
    class: string;
    path: string;
}

export class Image extends React.Component<IImageProps> {

    constructor(props: IImageProps) {
        super(props);
    }

  public render() {
    return (
      <img src={resolvePath ? resolvePath(this.props.path) : this.props.path} className={this.props.class} alt={path.basename(this.props.path)}/>
    );
  }
}
