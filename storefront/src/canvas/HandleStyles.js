// SINGLE SOURCE OF TRUTH for ALL handle styling
// Every connector (service, input, output) should use these exact same styles

export const HANDLE_STYLES = {
  // Base style that ALL handles share - NO EXCEPTIONS
  base: {
    width: "17px",
    height: "17px",
    border: "3px solid white",
    boxShadow: "0 2px 6px rgba(0, 0, 0, 0.2)",
    zIndex: -1,
    transition: "all 0.2s",
  },

  // Position-specific adjustments
  positions: {
    top: {},
    bottom: {},
    left: {},
    right: {},
  },

  // Hover effects for I/O handles
  hover: {
    onMouseEnter: (e) => {
      e.currentTarget.style.width = "20px";
      e.currentTarget.style.height = "20px";
      // Keep handles half-behind on hover (20px / 2 = 10px)
      if (e.currentTarget.style.left) e.currentTarget.style.left = "-10px";
      if (e.currentTarget.style.right) e.currentTarget.style.right = "-10px";
    },
    onMouseLeave: (e) => {
      e.currentTarget.style.width = "17px";
      e.currentTarget.style.height = "17px";
      // Reset to half-behind (17px / 2 = 8.5px)
      if (e.currentTarget.style.left) e.currentTarget.style.left = "-8.5px";
      if (e.currentTarget.style.right) e.currentTarget.style.right = "-8.5px";
    },
  },
};

// Helper functions to get consistent styles
export const getServiceConsumerStyle = (color) => ({
  ...HANDLE_STYLES.base,
  ...HANDLE_STYLES.positions.top,
  backgroundColor: color,
});

export const getServiceProviderStyle = (color) => ({
  ...HANDLE_STYLES.base,
  ...HANDLE_STYLES.positions.bottom,
  backgroundColor: color,
});

export const getInputHandleStyle = (color, offset) => ({
  ...HANDLE_STYLES.base,
  ...HANDLE_STYLES.positions.left,
  backgroundColor: color,
  top: `${offset}%`,
});

export const getOutputHandleStyle = (color, offset) => ({
  ...HANDLE_STYLES.base,
  ...HANDLE_STYLES.positions.right,
  backgroundColor: color,
  top: `${offset}%`,
});
