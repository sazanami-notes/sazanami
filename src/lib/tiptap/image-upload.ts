import { Extension } from '@tiptap/core';
import { Plugin } from '@tiptap/pm/state';

const uploadImage = async (file: File) => {
	const formData = new FormData();
	formData.append('file', file);

	const res = await fetch('/api/attachments', {
		method: 'POST',
		body: formData
	});
	const data = await res.json();

	if (data.success) {
		return data.url;
	}
	return null;
};

export const ImageUpload = Extension.create({
	name: 'imageUpload',

	addProseMirrorPlugins() {
		return [
			new Plugin({
				props: {
					handlePaste: (view, event) => {
						const items = event.clipboardData?.items;
						if (!items) return false;

						for (let i = 0; i < items.length; i++) {
							const file = items[i].getAsFile();
							if (file?.type.startsWith('image/')) {
								uploadImage(file).then((url) => {
									if (url) {
										const { schema } = view.state;
										const node = schema.nodes.image.create({ src: url });
										const transaction = view.state.tr.replaceSelectionWith(node);
										view.dispatch(transaction);
									}
								});
								return true; // handled
							}
						}
						return false; // not handled
					},
					handleDrop: (view, event: DragEvent) => {
						const files = event.dataTransfer?.files;
						if (!files) return false;

						for (let i = 0; i < files.length; i++) {
							const file = files[i];
							if (file.type.startsWith('image/')) {
								event.preventDefault();
								uploadImage(file).then((url) => {
									if (url) {
										const { schema } = view.state;
										const coords = view.posAtCoords({
											left: event.clientX,
											top: event.clientY
										});
										if (coords) {
											const node = schema.nodes.image.create({ src: url });
											const transaction = view.state.tr.insert(coords.pos, node);
											view.dispatch(transaction);
										}
									}
								});
								return true; // handled
							}
						}
						return false; // not handled
					}
				}
			})
		];
	}
});
