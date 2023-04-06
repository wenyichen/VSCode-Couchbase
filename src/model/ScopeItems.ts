/*
 *     Copyright 2011-2020 Couchbase, Inc.
 *
 *   Licensed under the Apache License, Version 2.0 (the "License");
 *   you may not use this file except in compliance with the License.
 *   You may obtain a copy of the License at
 *
 *       http://www.apache.org/licenses/LICENSE-2.0
 *
 *   Unless required by applicable law or agreed to in writing, software
 *   distributed under the License is distributed on an "AS IS" BASIS,
 *   WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 *   See the License for the specific language governing permissions and
 *   limitations under the License.
 */
import * as vscode from "vscode";
import * as path from "path";
import { IConnection } from "./IConnection";
import { INode } from "./INode";
import CollectionNode from "./CollectionNode";
import { QueryIndex } from "couchbase";
import IndexNode from "./IndexNode";

export class ScopeItems implements INode {
    constructor(
        public readonly parentNode: INode,
        public readonly connection: IConnection,
        public readonly itemName: string,
        public readonly bucketName: string,
        public readonly scopeName: string,
        public readonly collections: any[],
        public readonly indexes: QueryIndex[],
        public readonly collapsibleState: vscode.TreeItemCollapsibleState
    ) {
        vscode.workspace.fs.createDirectory(
            vscode.Uri.parse(
                `couchbase:/${bucketName}/${scopeName}/Indexes`
            )
        );
    }

    public getTreeItem(): vscode.TreeItem {
        return {
            label: `${this.itemName}`,
            collapsibleState: vscode.TreeItemCollapsibleState.Collapsed,
            contextValue: "scopeItem",
            iconPath: {
                light: path.join(
                    __filename,
                    "..",
                    "..",
                    "images/light",
                    "scope-item.svg"
                ),
                dark: path.join(
                    __filename,
                    "..",
                    "..",
                    "images/dark",
                    "scope-item.svg"
                ),
            },
        };
    }

    public async getChildren(): Promise<INode[]> {
        if (this.itemName === "Collections") {
            let collectionList: CollectionNode[] = [];

            for (const collection of this.collections) {
                try {
                    const queryResult = await this.connection.cluster?.query(
                        `select count(1) as count from \`${this.bucketName}\`.\`${this.scopeName}\`.\`${collection.name}\`;`
                    );
                    const count = queryResult?.rows[0].count;

                    const collectionTreeItem = new CollectionNode(
                        this,
                        this.connection,
                        this.scopeName,
                        count,
                        this.bucketName,
                        collection.name,
                        vscode.TreeItemCollapsibleState.None
                    );
                    collectionList.push(collectionTreeItem);
                } catch (err: any) {
                    console.log(err);
                    throw new Error(err);
                }
            }
            return collectionList;
        } else {
            let indexesList: INode[] = [];
            let result;
            try {
                result = await this.connection.cluster?.queryIndexes().getAllIndexes(this.bucketName, { scopeName: this.scopeName });
            } catch (err) {
                console.log("Error: Could not load Indexes", err);
            }
            if (result === undefined) { return []; }
            for (const query of result) {
                if (query.scopeName === this.scopeName) {
                    const indexNode = new IndexNode(
                        this,
                        this.connection,
                        this.scopeName,
                        this.bucketName,
                        `${query.name.substring(1)}_${(query.collectionName ?? "")}`,
                        query,
                        vscode.TreeItemCollapsibleState.None
                    );
                    indexesList.push(indexNode);
                }

            }
            return indexesList;
        }
    };
}
