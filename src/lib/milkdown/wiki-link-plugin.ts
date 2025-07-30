import { $node } from '@milkdown/utils';
import type { Node as ProseMirrorNode, NodeType } from '@milkdown/prose/model';
import wikiLinkPlugin from 'remark-wiki-link';
import type { NodeParserSpec, ParserState, NodeSerializerSpec, SerializerState, MarkdownNode } from '@milkdown/transformer';

// WikiLinkノードを定義します。
// このノードは、[[リンクテキスト]]のような内部リンクを表します。
export const wikiLink = $node('wiki_link', () => ({
  id: 'wiki_link',
  schema: () => ({
    inline: true, // インライン要素として扱います
    group: 'inline', // インライングループに属します
    atom: true, // 単一のProseMirrorノードとして扱います
    attrs: {
      content: {
        default: '' // リンクテキストを格納する属性
      }
    },
    parseDOM: [
      {
        tag: 'span[data-wiki-link]', // HTMLレンダリング時のタグ
        getAttrs: (dom: HTMLElement) => {
          return { content: dom.dataset.wikiLink || '' };
        }
      }
    ],
    toDOM: (node: ProseMirrorNode) => ['span', { 'data-wiki-link': node.attrs.content as string, class: 'wiki-link' }, node.attrs.content as string]
  }),
  // remark-wiki-linkをMilkdownのremarkパーサーに注入する設定
  // Milkdownのremarkプラグインは、`remarkPlugins`プロパティで追加します。
  remarkPlugins: () => [
    wikiLinkPlugin,
    {
      // remark-wiki-linkの設定。ここではデフォルトのまま。
      // 詳細な設定が必要な場合はここに追加
    }
  ],
  parser: {
    match: (node: { type: string }) => node.type === 'wikiLink', // remark-wiki-linkが生成するノードタイプ
    runner: (state: ParserState, node: MarkdownNode, type: NodeType) => { // state, node, typeの型を修正
      state.addNode(type, { content: node.value }); // node.data.permalinkを削除
    }
  },
  // toMarkdownとparseMarkdownプロパティをNodeSerializerSpecとNodeParserSpecの型に従って追加
  toMarkdown: {
    match: (node: ProseMirrorNode) => node.type.name === 'wiki_link',
    runner: (state: SerializerState, node: ProseMirrorNode) => {
      // wikiLinkノードをremarkのノードツリーに追加
      state.addNode('wikiLink', undefined, node.attrs.content as string, {
        value: node.attrs.content as string
      });
    }
  },
  parseMarkdown: {
    match: (node: MarkdownNode) => node.type === 'wikiLink',
    runner: (state: ParserState, node: MarkdownNode, proseType: NodeType) => {
      state.addNode(proseType, { content: node.value });
    }
  }
}));