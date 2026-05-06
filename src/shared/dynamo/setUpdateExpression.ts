export interface SetUpdateExpressionParts {
    UpdateExpression: string;
    ExpressionAttributeNames: Record<string, string>;
    ExpressionAttributeValues: Record<string, unknown>;
}

export interface BuildSetUpdateExpressionParams {
    item: object;
    keyAttributeName?: string;
}

export function buildSetUpdateExpression(
    params: BuildSetUpdateExpressionParams
): SetUpdateExpressionParts {
    const { item, keyAttributeName = "id" } = params;
    const entries = Object.entries(item as Record<string, unknown>).filter(
        ([key]) => key !== keyAttributeName
    );

    const ExpressionAttributeNames: Record<string, string> = {};
    const ExpressionAttributeValues: Record<string, unknown> = {};
    const setParts: string[] = [];

    let i = 0;
    for (const [attrName, value] of entries) {
        const namePlaceholder = `#a${i}`;
        const valuePlaceholder = `:v${i}`;
        ExpressionAttributeNames[namePlaceholder] = attrName;
        ExpressionAttributeValues[valuePlaceholder] =
            value === undefined ? null : value;
        setParts.push(`${namePlaceholder} = ${valuePlaceholder}`);
        i += 1;
    }

    return {
        UpdateExpression: `SET ${setParts.join(", ")}`,
        ExpressionAttributeNames,
        ExpressionAttributeValues,
    };
}
