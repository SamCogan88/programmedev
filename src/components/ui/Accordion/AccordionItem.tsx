/**
 * AccordionItem component.
 * Individual accordion item with header actions support.
 * The expand/collapse chevron is placed on the left of the header button.
 * Header actions sit outside the <button> as sibling elements on the right
 * to avoid nested-interactive a11y violations while remaining keyboard-accessible.
 * @module components/ui/Accordion/AccordionItem
 */

import { useEffect } from "react";

import type { KeyboardEvent, MouseEvent, ReactNode } from "react";
import { Accordion as BsAccordion } from "react-bootstrap";

import Icon from "../Icon";
import { useAccordion } from "./Accordion";

export interface AccordionItemProps {
  /** Unique key for this item */
  eventKey: string;
  /** Title displayed in the header */
  title: ReactNode;
  /** Optional subtitle displayed below the title or on the right */
  subtitle?: ReactNode;
  /** Position of the subtitle: 'below' (default) or 'right' */
  subtitlePosition?: "below" | "right";
  /** Item content */
  children: ReactNode;
  /** Optional actions to render in the header (use HeaderAction) */
  headerActions?: ReactNode;
  /** Additional CSS classes for the item */
  className?: string;
  /** Test ID for the item */
  "data-testid"?: string;
}

/**
 * AccordionItem component with support for header actions.
 *
 * The header is a flex row: [button (chevron-left + title)] [actions].
 * The button's ::after chevron is moved to the left via CSS (order: -1).
 * Header actions sit outside the button as siblings to satisfy a11y rules,
 * with background colours matched via CSS custom properties.
 *
 * @example
 * ```tsx
 * <AccordionItem
 *   eventKey="module-1"
 *   title="Introduction to Computing"
 *   subtitle="10 credits • Stage 1"
 *   headerActions={
 *     <HeaderAction onClick={handleRemove} icon="trash" label="Remove" />
 *   }
 * >
 *   <ModuleForm module={module} />
 * </AccordionItem>
 * ```
 */
export function AccordionItem({
  eventKey,
  title,
  subtitle,
  subtitlePosition = "below",
  children,
  headerActions,
  className = "",
  "data-testid": testId,
}: AccordionItemProps) {
  const { expandedKeys, toggleItem, registerItem } = useAccordion();
  const isExpanded = expandedKeys.has(eventKey);

  // Register this item with the parent accordion
  useEffect(() => {
    registerItem(eventKey);
  }, [eventKey, registerItem]);

  const handleToggle = () => {
    toggleItem(eventKey);
  };

  const handleHeaderKeyDown = (e: KeyboardEvent) => {
    if (e.key === "Enter" || e.key === " ") {
      e.preventDefault();
      toggleItem(eventKey);
    }
  };

  const headingId = `${eventKey}_heading`;
  const collapseId = `${eventKey}_collapse`;

  return (
    <BsAccordion.Item
      eventKey={eventKey}
      className={`bg-body${className ? ` ${className}` : ""}`}
      data-testid={testId}
    >
      <h2 className="accordion-header" id={headingId}>
        <div className="d-flex align-items-stretch">
          <button
            className={`accordion-button accordion-button--chevron-left flex-grow-1${isExpanded ? "" : " collapsed"}`}
            type="button"
            aria-expanded={isExpanded}
            aria-controls={collapseId}
            onClick={handleToggle}
            onKeyDown={handleHeaderKeyDown}
            data-testid={testId ? `${testId}-header` : undefined}
          >
            <div
              className={
                subtitlePosition === "right"
                  ? "d-flex w-100 align-items-center justify-content-between"
                  : "flex-grow-1"
              }
            >
              <div className="fw-semibold">{title}</div>
              {subtitle && subtitlePosition === "below" && (
                <div className="small text-secondary">{subtitle}</div>
              )}
              {subtitle && subtitlePosition === "right" && (
                <div className="small text-secondary me-2">{subtitle}</div>
              )}
            </div>
          </button>
          {headerActions && (
            <div className="header-actions d-flex align-items-center gap-2 px-2">
              {headerActions}
            </div>
          )}
        </div>
      </h2>
      <div id={collapseId}>
        <BsAccordion.Collapse eventKey={eventKey}>
          <BsAccordion.Body>{children}</BsAccordion.Body>
        </BsAccordion.Collapse>
      </div>
    </BsAccordion.Item>
  );
}

/**
 * HeaderAction component for use inside accordion headers.
 * Renders as a <span> with role="button" and tabIndex={0} for keyboard
 * accessibility. Placed outside the accordion <button> as a sibling to
 * avoid nested-interactive violations.
 */
export interface HeaderActionProps {
  /** Click handler */
  onClick: (e: MouseEvent) => void;
  /** Icon name */
  icon?: string;
  /** Button label */
  label?: string;
  /** Accessible label for screen readers */
  "aria-label"?: string;
  /** Button variant */
  variant?:
    | "primary"
    | "secondary"
    | "danger"
    | "outline-primary"
    | "outline-secondary"
    | "outline-danger";
  /** Test ID */
  "data-testid"?: string;
  /** Additional class name */
  className?: string;
  /** Additional data attributes for E2E testing */
  [key: `data-${string}`]: string | undefined;
}

/**
 * Header action for accordion items.
 * Uses span with role="button" for keyboard accessibility.
 * Lives outside the accordion <button> element to satisfy a11y rules.
 *
 * @example
 * ```tsx
 * <HeaderAction
 *   onClick={handleRemove}
 *   icon="trash"
 *   label="Remove"
 *   variant="outline-danger"
 *   aria-label="Remove module"
 * />
 * ```
 */
export function HeaderAction({
  onClick,
  icon,
  label,
  "aria-label": ariaLabel,
  variant = "outline-secondary",
  "data-testid": testId,
  className = "",
  ...rest
}: HeaderActionProps) {
  const handleClick = (e: MouseEvent) => {
    e.stopPropagation();
    onClick(e);
  };

  const handleKeyDown = (e: KeyboardEvent<HTMLSpanElement>) => {
    if (e.key === "Enter" || e.key === " ") {
      e.preventDefault();
      e.stopPropagation();
      onClick(e as unknown as MouseEvent);
    }
  };

  // Filter data-* attributes from rest props
  const dataProps = Object.fromEntries(
    Object.entries(rest).filter(([key]) => key.startsWith("data-")),
  );

  return (
    <span
      className={`btn btn-sm btn-${variant}${className ? ` ${className}` : ""}`}
      role="button"
      tabIndex={0}
      onClick={handleClick}
      onKeyDown={handleKeyDown}
      aria-label={ariaLabel ?? label}
      data-testid={testId}
      {...dataProps}
    >
      {icon && <Icon name={icon} className={label ? " me-1" : ""} aria-hidden="true" />}
      {label}
    </span>
  );
}

export default AccordionItem;
