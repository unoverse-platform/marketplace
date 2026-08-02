import React, { memo, useState, useMemo } from "react";
import ReactMarkdown from "react-markdown";
import { NodeResizer, useReactFlow } from "@xyflow/react";
import { Lock, Unlock } from "lucide-react";

const NoteNode = memo(
  ({ id, data, selected }) => {
    const [isHovered, setIsHovered] = useState(false);
    const { setNodes } = useReactFlow();

    // Get config with defaults
    const config = data?.config || {};
    const backgroundColor = config.backgroundColor || "#fffbeb";
    const fontSize = config.fontSize || 14;
    const content = config.content || "# Note\n\nAdd your markdown content here...";
    const isLocked = config.locked || false;

    const handleMouseEnter = () => setIsHovered(true);
    const handleMouseLeave = () => setIsHovered(false);

    const handleLockToggle = (e) => {
      e.stopPropagation(); // Prevent node selection

      setNodes((nodes) =>
        nodes.map((node) => {
          if (node.id === id) {
            const newLocked = !isLocked;
            return {
              ...node,
              draggable: !newLocked, // Update draggable property
              data: {
                ...node.data,
                config: {
                  ...node.data.config,
                  locked: newLocked,
                },
              },
            };
          }
          return node;
        })
      );
    };

    return (
      <>
        {/* NodeResizer - always render, use isVisible to control visibility */}
        <NodeResizer
          isVisible={selected && !isLocked}
          minWidth={200}
          minHeight={100}
          lineStyle={{ borderColor: "#3b82f6", borderWidth: 1 }}
          handleStyle={{
            width: 8,
            height: 8,
            borderRadius: 2,
            backgroundColor: "#3b82f6",
            border: "none",
          }}
        />
        <div
          className={`
          note-node relative rounded-lg transition-all duration-200
          ${selected ? "shadow-xl ring-2 ring-blue-500 ring-opacity-20" : "shadow-md hover:shadow-lg"}
          ${!selected && !isLocked ? "hover:scale-[1.01]" : ""}
        `}
          style={{
            width: "100%",
            height: "100%",
            minWidth: 200,
            minHeight: 100,
            boxSizing: "border-box",
            border: selected ? "0px solid #6366f1" : "1px solid rgba(255, 255, 255, 0.5)",
            opacity: isHovered || selected ? 1 : 0.9,
            position: "relative",
            zIndex: -1000,
            background: `
            linear-gradient(135deg, 
              rgba(255, 255, 255, 0.25) 0%, 
              rgba(255, 255, 255, 0.1) 100%
            ),
            ${backgroundColor}
          `,
            backdropFilter: "blur(10px) saturate(180%)",
            WebkitBackdropFilter: "blur(10px) saturate(180%)",
            boxShadow: selected
              ? `
              0 8px 32px rgba(31, 38, 135, 0.37),
              inset 0 1px 0 rgba(255, 255, 255, 0.5),
              inset 0 -1px 0 rgba(255, 255, 255, 0.2)
            `
              : `
              0 4px 16px rgba(31, 38, 135, 0.2),
              inset 0 1px 0 rgba(255, 255, 255, 0.3),
              inset 0 -1px 0 rgba(255, 255, 255, 0.1)
            `,
          }}
          onMouseEnter={handleMouseEnter}
          onMouseLeave={handleMouseLeave}
        >
          {/* Lock indicator button */}
          <button
            onClick={handleLockToggle}
            className={`
            absolute top-2 right-2 p-1.5 rounded-md transition-all duration-200 cursor-pointer
            ${
              isLocked
                ? "bg-gray-200 text-gray-700 hover:bg-gray-300"
                : "bg-transparent hover:bg-gray-100 text-gray-400 hover:text-gray-700"
            }
            ${selected || isHovered ? "opacity-100" : "opacity-0"}
          `}
            style={{ zIndex: 10 }}
            title={isLocked ? "Click to unlock" : "Click to lock"}
          >
            {isLocked ? <Lock className="w-4 h-4" /> : <Unlock className="w-4 h-4" />}
          </button>

          {/* Note Content */}
          <div
            className="p-6 h-full overflow-auto prose prose-xs prose-headings:text-gray-700 prose-p:text-gray-700 prose-li:text-gray-700 prose-strong:text-gray-700 prose-code:text-gray-800 prose-code:bg-gray-100 prose-code:px-2 prose-code:py-1 prose-code:rounded-md prose-code:font-mono prose-code:text-sm prose-pre:overflow-x-auto prose-pre:text-gray-200 prose-pre:bg-gray-900 prose-pre:border prose-pre:border-gray-700 prose-pre:shadow-lg"
            style={{
              maxWidth: "50ch",
              fontSize: `${fontSize}px`,
              lineHeight: "1.4",
            }}
          >
            <style>{`
            .prose h1 {
              margin-top: 0.5em;
              margin-bottom: 0.75em;
            }
            .prose h2 {
              margin-top: 0.75em;
              margin-bottom: 0.75em;
            }
            .prose h3 {
              margin-top: 0.75em;
              margin-bottom: 0.75em;
            }
            .prose p {
              margin-top: 0.5em;
              margin-bottom: 0.75em;
            }
            .prose ul,
            .prose ol {
              margin-top: 0.5em;
              margin-bottom: 0.75em;
            }
            .prose li {
              margin-top: 0.25em;
              margin-bottom: 0.25em;
            }
            .prose img {
              margin-top: 0.5em;
              margin-bottom: 0.75em;
            }
            .prose pre {
              margin-top: 2em;
              margin-bottom: 1em;
              padding: 1rem;
              border-radius: 8px;
              background: linear-gradient(145deg, #1a1a1a 0%, #2d2d2d 100%) !important;
              border: 1px solid rgba(255, 255, 255, 0.1) !important;
              box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06),
                inset 0 1px 0 rgba(255, 255, 255, 0.1) !important;
              white-space: pre-wrap;
              overflow-wrap: break-word;
            }
            .prose code {
              font-size: 0.875em;
              font-weight: 500;
              font-family: "SF Mono", "Monaco", "Inconsolata", "Roboto Mono", monospace;
              letter-spacing: -0.025em;
            }
            .prose pre code {
              color: #e5e7eb !important;
              background: transparent !important;
              padding: 0 !important;
              border-radius: 0 !important;
              font-size: 0.8125rem !important;
            }
            .prose :not(pre) > code {
              background: linear-gradient(145deg, #f8f9fa 0%, #e9ecef 100%) !important;
              color: #495057 !important;
              border: 1px solid rgba(0, 0, 0, 0.05) !important;
              box-shadow: inset 0 1px 0 rgba(255, 255, 255, 0.8) !important;
            }
          `}</style>
            <ReactMarkdown
              components={{
                code({ node, inline, className, children, ...props }) {
                  return (
                    <code className={className} {...props}>
                      {String(children).replace(/\n$/, "")}
                    </code>
                  );
                },
                img({ node, alt, src, title, ...props }) {
                  // Parse width from alt text if specified like: ![Alt text|width=200px](url)
                  let imageWidth = "100%";
                  let cleanAlt = alt;

                  if (alt && alt.includes("|width=")) {
                    const parts = alt.split("|width=");
                    cleanAlt = parts[0];
                    imageWidth = parts[1];
                  }

                  return (
                    <img
                      {...props}
                      alt={cleanAlt}
                      src={src}
                      title={title}
                      style={{
                        maxWidth: "100%",
                        width: imageWidth,
                        height: "auto",
                        marginTop: "0.5em",
                        marginBottom: "0.5em",
                      }}
                    />
                  );
                },
              }}
            >
              {content}
            </ReactMarkdown>
          </div>
        </div>
      </>
    );
  },
  (prevProps, nextProps) => {
    // Custom comparison to prevent unnecessary re-renders
    return (
      prevProps.id === nextProps.id &&
      prevProps.selected === nextProps.selected &&
      prevProps.data?.config?.content === nextProps.data?.config?.content &&
      prevProps.data?.config?.backgroundColor === nextProps.data?.config?.backgroundColor &&
      prevProps.data?.config?.fontSize === nextProps.data?.config?.fontSize &&
      prevProps.data?.config?.locked === nextProps.data?.config?.locked
    );
  }
);

NoteNode.displayName = "NoteNode";

export default NoteNode;
