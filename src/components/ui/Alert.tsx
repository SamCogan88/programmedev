/**
 * Alert components - Bootstrap alert wrappers with icon support.
 * Provides InfoAlert, WarningAlert, and ErrorAlert variants.
 * @module components/ui/Alert
 */

import type { ReactNode } from "react";
import { Alert as BsAlert } from "react-bootstrap";

import { Icon } from "./Icon";

export interface AlertProps {
  /** Alert content */
  children: ReactNode;
  /** Additional CSS classes */
  className?: string;
  /** Test ID for the alert */
  "data-testid"?: string;
}

export interface CustomAlertProps extends AlertProps {
  /** Bootstrap alert variant */
  variant: "primary" | "secondary" | "success" | "danger" | "warning" | "info" | "light" | "dark";
  /** Optional icon name */
  icon?: string;
}

/**
 * Base Alert component with customizable variant and icon.
 */
export function Alert({
  variant,
  icon,
  children,
  className = "",
  "data-testid": testId,
}: CustomAlertProps) {
  return (
    <BsAlert variant={variant} className={className} data-testid={testId}>
      {icon && <Icon name={icon} className="me-2" />}
      {children}
    </BsAlert>
  );
}

/**
 * Info alert with lightbulb icon.
 *
 * @example
 * ```tsx
 * <InfoAlert>This is helpful information.</InfoAlert>
 * ```
 */
export function InfoAlert({ children, className, "data-testid": testId }: AlertProps) {
  return (
    <Alert variant="light" icon="lightbulb" className={className} data-testid={testId}>
      {children}
    </Alert>
  );
}

/**
 * Warning alert with warning icon.
 *
 * @example
 * ```tsx
 * <WarningAlert>Please review this before continuing.</WarningAlert>
 * ```
 */
export function WarningAlert({ children, className, "data-testid": testId }: AlertProps) {
  return (
    <Alert variant="warning" icon="warning" className={className} data-testid={testId}>
      {children}
    </Alert>
  );
}

/**
 * Error alert with warning-circle icon.
 *
 * @example
 * ```tsx
 * <ErrorAlert>An error occurred. Please try again.</ErrorAlert>
 * ```
 */
export function ErrorAlert({ children, className, "data-testid": testId }: AlertProps) {
  return (
    <Alert variant="danger" icon="warning-circle" className={className} data-testid={testId}>
      {children}
    </Alert>
  );
}

/**
 * Success alert with check-circle icon.
 *
 * @example
 * ```tsx
 * <SuccessAlert>Operation completed successfully.</SuccessAlert>
 * ```
 */
export function SuccessAlert({ children, className, "data-testid": testId }: AlertProps) {
  return (
    <Alert variant="success" icon="check-circle" className={className} data-testid={testId}>
      {children}
    </Alert>
  );
}

export default Alert;
