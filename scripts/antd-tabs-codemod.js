/**
 * Codemod: antd Tabs.TabPane -> Tabs items
 * 用 jscodeshift 批量替换
 */
export default function transformer(file, api) {
  const j = api.jscodeshift;
  const root = j(file.source);

  // 找到 Tabs
  root.findJSXElements('Tabs').forEach(path => {
    const tabPanes = [];

    // 找 Tabs 的子元素 TabPane
    j(path)
      .find(j.JSXElement, {
        openingElement: { name: { name: 'TabPane' } },
      })
      .forEach(panePath => {
        const pane = panePath.node;
        const keyAttr = pane.openingElement.attributes.find(
          a => a.name?.name === 'key'
        );
        const tabAttr = pane.openingElement.attributes.find(
          a => a.name?.name === 'tab'
        );

        tabPanes.push(
          j.objectExpression([
            j.objectProperty(
              j.identifier('key'),
              keyAttr ? keyAttr.value.expression || keyAttr.value : j.literal('')
            ),
            j.objectProperty(
              j.identifier('label'),
              tabAttr ? tabAttr.value.expression || tabAttr.value : j.literal('')
            ),
            j.objectProperty(
              j.identifier('children'),
              j.jsxFragment(
                j.jsxOpeningFragment(),
                j.jsxClosingFragment(),
                pane.children
              )
            ),
          ])
        );
      });

    if (tabPanes.length) {
      // 删除原来的 TabPane children
      path.node.children = [];

      // 增加 items 属性
      path.node.openingElement.attributes.push(
        j.jsxAttribute(
          j.jsxIdentifier('items'),
          j.jsxExpressionContainer(j.arrayExpression(tabPanes))
        )
      );
    }
  });

  return root.toSource({ quote: 'single' });
}

