
<script>
  
	import { Color } from '@tiptap/extension-text-style'
	import { ListItem } from '@tiptap/extension-list'
	import { TextStyle } from '@tiptap/extension-text-style'
	import StarterKit from "@tiptap/starter-kit";
	import { Editor } from "@tiptap/core";
	import { onMount } from "svelte";
  
	let element;
	let editor;
  
	onMount(() => {
	  editor = new Editor({
		element: element,
		extensions: [
		  Color.configure({ types: [TextStyle.name, ListItem.name] }),
		  TextStyle.configure({ types: [ListItem.name] }),
		  StarterKit,
		],
		content: `
			  <h2>
				Hi there,
			  </h2>
			  <p>
				this is a <em>basic</em> example of <strong>Tiptap</strong>. Sure, there are all kind of basic text styles you’d probably expect from a text editor. But wait until you see the lists:
			  </p>
			  <ul>
				<li>
				  That’s a bullet list with one …
				</li>
				<li>
				  … or two list items.
				</li>
			  </ul>
			  <p>
				Isn’t that great? And all of that is editable. But wait, there’s more. Let’s try a code block:
			  </p>
			  <pre><code class="language-css">body {
	display: none;
  }</code></pre>
			  <p>
				I know, I know, this is impressive. It’s only the tip of the iceberg though. Give it a try and click a little bit around. Don’t forget to check the other examples too.
			  </p>
			  <blockquote>
				Wow, that’s amazing. Good work, boy! 👏
				<br />
				— Mom
			  </blockquote>
			`,
			editorProps: {
      attributes: {
        // ここにフォーカス時のスタイルを追加します
        class: 'focus:outline-none',
      },
    },
		onTransaction: () => {
		  // force re-render so `editor.isActive` works as expected
		  editor = editor;
		},
	  });
	});
  </script>
  

  <div bind:this={element} class="prose m-6 py-2 px-6 shadow-lg bg-gray-100" />
  
