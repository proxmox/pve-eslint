/**
 * @fileoverview Disallow redundant return statements
 * @author Teddy Katz
 */
"use strict";

//------------------------------------------------------------------------------
// Requirements
//------------------------------------------------------------------------------

const astUtils = require("./utils/ast-utils"),
    FixTracker = require("./utils/fix-tracker");

//------------------------------------------------------------------------------
// Helpers
//------------------------------------------------------------------------------

/**
 * Removes the given element from the array.
 * @param {Array} array The source array to remove.
 * @param {any} element The target item to remove.
 * @returns {void}
 */
function remove(array, element) {
    const index = array.indexOf(element);

    if (index !== -1) {
        array.splice(index, 1);
    }
}

/**
 * Checks whether it can remove the given return statement or not.
 * @param {ASTNode} node The return statement node to check.
 * @returns {boolean} `true` if the node is removable.
 */
function isRemovable(node) {
    return astUtils.STATEMENT_LIST_PARENTS.has(node.parent.type);
}

/**
 * Checks whether the given return statement is in a `finally` block or not.
 * @param {ASTNode} node The return statement node to check.
 * @returns {boolean} `true` if the node is in a `finally` block.
 */
function isInFinally(node) {
    for (
        let currentNode = node;
        currentNode && currentNode.parent && !astUtils.isFunction(currentNode);
        currentNode = currentNode.parent
    ) {
        if (currentNode.parent.type === "TryStatement" && currentNode.parent.finalizer === currentNode) {
            return true;
        }
    }

    return false;
}

//------------------------------------------------------------------------------
// Rule Definition
//------------------------------------------------------------------------------

/** @type {import('../shared/types').Rule} */
module.exports = {
    meta: {
        type: "suggestion",

        docs: {
            description: "Disallow redundant return statements",
            recommended: false,
            url: "https://eslint.org/docs/latest/rules/no-useless-return"
        },

        fixable: "code",
        schema: [],

        messages: {
            unnecessaryReturn: "Unnecessary return statement."
        }
    },

    create(context) {
        const segmentInfoMap = new WeakMap();
        const usedUnreachableSegments = new WeakSet();
        const sourceCode = context.sourceCode;
        let scopeInfo = null;

        /**
         * Checks whether the given segment is terminated by a return statement or not.
         * @param {CodePathSegment} segment The segment to check.
         * @returns {boolean} `true` if the segment is terminated by a return statement, or if it's still a part of unreachable.
         */
        function isReturned(segment) {
            const info = segmentInfoMap.get(segment);

            return !info || info.returned;
        }

        /**
         * Collects useless return statements from the given previous segments.
         *
         * A previous segment may be an unreachable segment.
         * In that case, the information object of the unreachable segment is not
         * initialized because `onCodePathSegmentStart` event is not notified for
         * unreachable segments.
         * This goes to the previous segments of the unreachable segment recursively
         * if the unreachable segment was generated by a return statement. Otherwise,
         * this ignores the unreachable segment.
         *
         * This behavior would simulate code paths for the case that the return
         * statement does not exist.
         * @param {ASTNode[]} uselessReturns The collected return statements.
         * @param {CodePathSegment[]} prevSegments The previous segments to traverse.
         * @param {WeakSet<CodePathSegment>} [providedTraversedSegments] A set of segments that have already been traversed in this call
         * @returns {ASTNode[]} `uselessReturns`.
         */
        function getUselessReturns(uselessReturns, prevSegments, providedTraversedSegments) {
            const traversedSegments = providedTraversedSegments || new WeakSet();

            for (const segment of prevSegments) {
                if (!segment.reachable) {
                    if (!traversedSegments.has(segment)) {
                        traversedSegments.add(segment);
                        getUselessReturns(
                            uselessReturns,
                            segment.allPrevSegments.filter(isReturned),
                            traversedSegments
                        );
                    }
                    continue;
                }

                uselessReturns.push(...segmentInfoMap.get(segment).uselessReturns);
            }

            return uselessReturns;
        }

        /**
         * Removes the return statements on the given segment from the useless return
         * statement list.
         *
         * This segment may be an unreachable segment.
         * In that case, the information object of the unreachable segment is not
         * initialized because `onCodePathSegmentStart` event is not notified for
         * unreachable segments.
         * This goes to the previous segments of the unreachable segment recursively
         * if the unreachable segment was generated by a return statement. Otherwise,
         * this ignores the unreachable segment.
         *
         * This behavior would simulate code paths for the case that the return
         * statement does not exist.
         * @param {CodePathSegment} segment The segment to get return statements.
         * @returns {void}
         */
        function markReturnStatementsOnSegmentAsUsed(segment) {
            if (!segment.reachable) {
                usedUnreachableSegments.add(segment);
                segment.allPrevSegments
                    .filter(isReturned)
                    .filter(prevSegment => !usedUnreachableSegments.has(prevSegment))
                    .forEach(markReturnStatementsOnSegmentAsUsed);
                return;
            }

            const info = segmentInfoMap.get(segment);

            for (const node of info.uselessReturns) {
                remove(scopeInfo.uselessReturns, node);
            }
            info.uselessReturns = [];
        }

        /**
         * Removes the return statements on the current segments from the useless
         * return statement list.
         *
         * This function will be called at every statement except FunctionDeclaration,
         * BlockStatement, and BreakStatement.
         *
         * - FunctionDeclarations are always executed whether it's returned or not.
         * - BlockStatements do nothing.
         * - BreakStatements go the next merely.
         * @returns {void}
         */
        function markReturnStatementsOnCurrentSegmentsAsUsed() {
            scopeInfo
                .codePath
                .currentSegments
                .forEach(markReturnStatementsOnSegmentAsUsed);
        }

        //----------------------------------------------------------------------
        // Public
        //----------------------------------------------------------------------

        return {

            // Makes and pushes a new scope information.
            onCodePathStart(codePath) {
                scopeInfo = {
                    upper: scopeInfo,
                    uselessReturns: [],
                    codePath
                };
            },

            // Reports useless return statements if exist.
            onCodePathEnd() {
                for (const node of scopeInfo.uselessReturns) {
                    context.report({
                        node,
                        loc: node.loc,
                        messageId: "unnecessaryReturn",
                        fix(fixer) {
                            if (isRemovable(node) && !sourceCode.getCommentsInside(node).length) {

                                /*
                                 * Extend the replacement range to include the
                                 * entire function to avoid conflicting with
                                 * no-else-return.
                                 * https://github.com/eslint/eslint/issues/8026
                                 */
                                return new FixTracker(fixer, sourceCode)
                                    .retainEnclosingFunction(node)
                                    .remove(node);
                            }
                            return null;
                        }
                    });
                }

                scopeInfo = scopeInfo.upper;
            },

            /*
             * Initializes segments.
             * NOTE: This event is notified for only reachable segments.
             */
            onCodePathSegmentStart(segment) {
                const info = {
                    uselessReturns: getUselessReturns([], segment.allPrevSegments),
                    returned: false
                };

                // Stores the info.
                segmentInfoMap.set(segment, info);
            },

            // Adds ReturnStatement node to check whether it's useless or not.
            ReturnStatement(node) {
                if (node.argument) {
                    markReturnStatementsOnCurrentSegmentsAsUsed();
                }
                if (
                    node.argument ||
                    astUtils.isInLoop(node) ||
                    isInFinally(node) ||

                    // Ignore `return` statements in unreachable places (https://github.com/eslint/eslint/issues/11647).
                    !scopeInfo.codePath.currentSegments.some(s => s.reachable)
                ) {
                    return;
                }

                for (const segment of scopeInfo.codePath.currentSegments) {
                    const info = segmentInfoMap.get(segment);

                    if (info) {
                        info.uselessReturns.push(node);
                        info.returned = true;
                    }
                }
                scopeInfo.uselessReturns.push(node);
            },

            /*
             * Registers for all statement nodes except FunctionDeclaration, BlockStatement, BreakStatement.
             * Removes return statements of the current segments from the useless return statement list.
             */
            ClassDeclaration: markReturnStatementsOnCurrentSegmentsAsUsed,
            ContinueStatement: markReturnStatementsOnCurrentSegmentsAsUsed,
            DebuggerStatement: markReturnStatementsOnCurrentSegmentsAsUsed,
            DoWhileStatement: markReturnStatementsOnCurrentSegmentsAsUsed,
            EmptyStatement: markReturnStatementsOnCurrentSegmentsAsUsed,
            ExpressionStatement: markReturnStatementsOnCurrentSegmentsAsUsed,
            ForInStatement: markReturnStatementsOnCurrentSegmentsAsUsed,
            ForOfStatement: markReturnStatementsOnCurrentSegmentsAsUsed,
            ForStatement: markReturnStatementsOnCurrentSegmentsAsUsed,
            IfStatement: markReturnStatementsOnCurrentSegmentsAsUsed,
            ImportDeclaration: markReturnStatementsOnCurrentSegmentsAsUsed,
            LabeledStatement: markReturnStatementsOnCurrentSegmentsAsUsed,
            SwitchStatement: markReturnStatementsOnCurrentSegmentsAsUsed,
            ThrowStatement: markReturnStatementsOnCurrentSegmentsAsUsed,
            TryStatement: markReturnStatementsOnCurrentSegmentsAsUsed,
            VariableDeclaration: markReturnStatementsOnCurrentSegmentsAsUsed,
            WhileStatement: markReturnStatementsOnCurrentSegmentsAsUsed,
            WithStatement: markReturnStatementsOnCurrentSegmentsAsUsed,
            ExportNamedDeclaration: markReturnStatementsOnCurrentSegmentsAsUsed,
            ExportDefaultDeclaration: markReturnStatementsOnCurrentSegmentsAsUsed,
            ExportAllDeclaration: markReturnStatementsOnCurrentSegmentsAsUsed
        };
    }
};
