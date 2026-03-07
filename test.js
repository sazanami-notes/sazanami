import { marked } from 'marked';
function preprocessWikiLinks(md) {
    let processed = md.replace(/!\[\[(.*?)\]\]/g, '\n\n<div data-note-embed title="$1"></div>\n\n');
    return processed.replace(
        /\[\[(.*?)\]\]/g,
        '<span class="wiki-link-mark" data-wiki-link="true">[[$1]]</span>'
    );
}

const md = "\n\n![[test]]\n\n";
const processed = preprocessWikiLinks(md);
console.log("PROCESSED:\n" + processed);
console.log("HTML:\n" + marked.parse(processed));
