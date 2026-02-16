/**
 * Barrel export for all UI components.
 * @module components/ui
 */

// Icon
export { Icon, type IconProps } from "./Icon";

// SectionCard
export { SectionCard, type SectionCardProps } from "./SectionCard";

// Alert
export {
  Alert,
  type AlertProps,
  type CustomAlertProps,
  ErrorAlert,
  InfoAlert,
  SuccessAlert,
  WarningAlert,
} from "./Alert";

// Accordion
export {
  Accordion,
  type AccordionContextValue,
  AccordionControls,
  type AccordionControlsProps,
  AccordionItem,
  type AccordionItemProps,
  type AccordionProps,
  HeaderAction,
  type HeaderActionProps,
  useAccordion,
} from "./Accordion";

// Form
export {
  FormField,
  type FormFieldProps,
  FormInput,
  type FormInputProps,
  FormSelect,
  type FormSelectProps,
  type SelectOption,
} from "./Form";
