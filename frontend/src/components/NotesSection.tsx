type NotesSectionProps = {
  noteDraft: string;
  setNoteDraft: (value: string) => void;
  addNote: (event?: React.FormEvent<HTMLFormElement>) => void;
  roundNotes: string[];
  deleteNote: (index: number) => void;
};

export function NotesSection({ noteDraft, setNoteDraft, addNote, roundNotes, deleteNote }: NotesSectionProps) {
  return (
    <section className="card" aria-label="round notes">
      <h2>Notes</h2>
      <form className="note-form" onSubmit={addNote}>
        <textarea
          className="notes-input"
          value={noteDraft}
          onChange={(event) => setNoteDraft(event.target.value)}
          placeholder="Add a note..."
          rows={3}
        />
        <button type="submit">Save note</button>
      </form>
      <div className="notes-list">
        {roundNotes.length > 0 ? (
          roundNotes
            .map((note, index) => ({ note, index }))
            .reverse()
            .map(({ note, index }) => (
              <div key={`${index}-${note.slice(0, 20)}`} className="note-item">
                <p>{note}</p>
                <button onClick={() => deleteNote(index)}>Delete</button>
              </div>
            ))
        ) : (
          <p className="hint">No notes yet.</p>
        )}
      </div>
    </section>
  );
}
