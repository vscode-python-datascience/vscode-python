// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.

'use strict';

import { injectable, inject } from 'inversify';
import { WebPanel } from './webpanel';
import { IWebPanelMessageListener, IWebPanelProvider } from './types';
import { IServiceContainer } from '../../ioc/types';

@injectable()
export class WebPanelProvider implements IWebPanelProvider {
    private serviceContainer: IServiceContainer;

    constructor(@inject(IServiceContainer) private svc: IServiceContainer) {
        this.serviceContainer = svc;
    }


    public create(listener: IWebPanelMessageListener, title:string, htmlPath:string) {
        return new WebPanel(this.serviceContainer, listener, title, htmlPath);
    }
}
