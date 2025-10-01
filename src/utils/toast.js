import { toast } from "react-toastify";

// 🎨 Fiori-style boje
const TOAST_COLORS = {
  success: "#107e3e", // SAP Green
  error: "#bb0000",   // SAP Red
  warning: "#e9730c", // SAP Orange
  info: "#0a6ed1",    // SAP Blue
};

const defaultOptions = {
  position: "top-right",
  autoClose: 4000,
  hideProgressBar: false,
  closeOnClick: true,
  pauseOnHover: true,
  draggable: true,
  progress: undefined,
  theme: "light",
};

// Export standardizirane funkcije
export const notify = {
  success: (msg) =>
    toast.success(msg, {
      ...defaultOptions,
      style: { backgroundColor: TOAST_COLORS.success, color: "#fff" },
    }),
  error: (msg) =>
    toast.error(msg, {
      ...defaultOptions,
      style: { backgroundColor: TOAST_COLORS.error, color: "#fff" },
    }),
  warning: (msg) =>
    toast.warning(msg, {
      ...defaultOptions,
      style: { backgroundColor: TOAST_COLORS.warning, color: "#fff" },
    }),
  info: (msg) =>
    toast.info(msg, {
      ...defaultOptions,
      style: { backgroundColor: TOAST_COLORS.info, color: "#fff" },
    }),
};
