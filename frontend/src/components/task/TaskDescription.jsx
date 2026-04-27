import { useEditor, EditorContent } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import { useEffect } from 'react';

export default function TaskDescription({ content, onUpdate, editable = true }) {
    const editor = useEditor({
        extensions: [
            StarterKit.configure({
                heading: false,
                bold: true,
                italic: true,
                bulletList: true,
                orderedList: true,
            }),
        ],
        content: content || '',
        editable,
        onUpdate: ({ editor }) => {
            onUpdate?.(editor.getHTML());
        },
        editorProps: {
            attributes: {
                class: 'text-sm outline-none min-h-[100px]',
                style: 'color: #2C2C2C',
            },
        },
    });

    useEffect(() => {
        if (editor && content !== editor.getHTML()) {
            editor.commands.setContent(content || '');
        }
    }, [content, editor]);

    if (!editor) return null;

    return (
        <div className="task-description">
            <EditorContent editor={editor} />
        </div>
    );
}