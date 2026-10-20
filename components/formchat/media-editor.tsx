"use client";
import { ImagePlus } from "lucide-react";
import { FormMedia, Question } from "@/lib/model";
import { ImagePicker } from "./ui";
export function MediaEditor({
  value,
  onChange,
  label = "Question image",
}: {
  value?: FormMedia;
  onChange: (m: FormMedia | undefined) => void;
  label?: string;
}) {
  const patch = (p: Partial<FormMedia>) =>
    onChange({
      src: "",
      alt: "",
      fit: "cover",
      layout: "above",
      ...value,
      ...p,
    });
  return (
    <div className="media-editor">
      <ImagePicker
        label={
          value?.src
            ? `Replace ${label.toLowerCase()}`
            : `Upload ${label.toLowerCase()}`
        }
        value={value?.src || ""}
        onChange={(src) => (src ? patch({ src }) : onChange(undefined))}
      />
      {value?.src && (
        <>
          <label>
            Image description
            <input
              value={value.alt}
              maxLength={240}
              placeholder="Describe the image for people using screen readers"
              onChange={(e) => patch({ alt: e.target.value })}
            />
          </label>
          <div className="field-grid">
            <label>
              Image layout
              <select
                value={value.layout}
                onChange={(e) =>
                  patch({ layout: e.target.value as FormMedia["layout"] })
                }
              >
                <option value="above">Above the question</option>
                <option value="side">Beside the question</option>
              </select>
            </label>
            <label>
              Image fit
              <select
                value={value.fit}
                onChange={(e) =>
                  patch({ fit: e.target.value as FormMedia["fit"] })
                }
              >
                <option value="cover">Fill & crop</option>
                <option value="contain">Show entire image</option>
              </select>
            </label>
          </div>
          <p className="small">
            Side images stack above the question on small screens.
          </p>
        </>
      )}
    </div>
  );
}
export default function QuestionMedia({
  question: q,
  onChange,
}: {
  question: Question;
  onChange: (patch: Partial<Question>) => void;
}) {
  return (
    <details className="question-media-settings">
      <summary>
        <ImagePlus size={16} />
        Question image
        {q.media?.src || Object.values(q.optionImages || {}).some(Boolean) ? (
          <span className="media-added">Added</span>
        ) : null}
      </summary>
      <p className="small">
        Add a supporting image above or beside this question.
      </p>
      <MediaEditor value={q.media} onChange={(media) => onChange({ media })} />
    </details>
  );
}
