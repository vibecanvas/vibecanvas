import { system, System } from "@lastolivegames/becsy";
import { PointerContact } from "../components/PointerContact";
import { PointerFrame } from "../components/PointerFrame";
import type { TCanvasPointerInput } from "../../input/pointer.types";

type TPointerBridge = {
  consumePointerInputs: () => TCanvasPointerInput[];
};

@system(s => s.beforeReadersOf(PointerFrame).beforeReadersOf(PointerContact))
export class PointerEventSystem extends System {
  bridge!: TPointerBridge;
  private frame = this.singleton.write(PointerFrame);
  private contacts = this.query(q => q.current.with(PointerContact).write);

  initialize(): void {
    this.frame.events = [];
    this.frame.activePointerCount = 0;
    this.frame.hasMultiTouch = false;
    this.frame.primaryPointerId = -1;
    this.frame.centroidClientX = 0;
    this.frame.centroidClientY = 0;
    this.frame.centroidCanvasX = 0;
    this.frame.centroidCanvasY = 0;
    this.frame.pinchDistance = 0;
  }

  execute(): void {
    const events = this.bridge.consumePointerInputs();
    const contacts = new Map<number, ReturnType<typeof this.createEntity>>();

    for (const entity of this.contacts.current) {
      contacts.set(entity.read(PointerContact).pointerId, entity);
    }

    this.frame.events = events;

    for (const event of events) {
      if (event.phase === "down") {
        const existing = contacts.get(event.pointerId);
        if (existing) {
          this.#writeContact(existing, event, true);
          continue;
        }

        const entity = this.createEntity(PointerContact, {
          pointerId: event.pointerId,
          pointerType: event.pointerType,
          isPrimary: event.isPrimary,
          button: event.button,
          buttons: event.buttons,
          pressure: event.pressure,
          startClientX: event.clientX,
          startClientY: event.clientY,
          clientX: event.clientX,
          clientY: event.clientY,
          startCanvasX: event.canvasX,
          startCanvasY: event.canvasY,
          canvasX: event.canvasX,
          canvasY: event.canvasY,
          altKey: event.altKey,
          ctrlKey: event.ctrlKey,
          metaKey: event.metaKey,
          shiftKey: event.shiftKey,
          timestamp: event.timestamp,
        });

        contacts.set(event.pointerId, entity);
        continue;
      }

      const entity = contacts.get(event.pointerId);
      if (!entity) {
        continue;
      }

      this.#writeContact(entity, event, false);

      if (event.phase === "up" || event.phase === "cancel") {
        entity.delete();
        contacts.delete(event.pointerId);
      }
    }

    this.#writeFrameAggregate([...contacts.values()]);
  }

  #writeContact(entity: ReturnType<typeof this.createEntity>, event: TCanvasPointerInput, resetStart: boolean): void {
    const contact = entity.write(PointerContact);

    contact.pointerId = event.pointerId;
    contact.pointerType = event.pointerType;
    contact.isPrimary = event.isPrimary;
    contact.button = event.button;
    contact.buttons = event.buttons;
    contact.pressure = event.pressure;
    contact.clientX = event.clientX;
    contact.clientY = event.clientY;
    contact.canvasX = event.canvasX;
    contact.canvasY = event.canvasY;
    contact.altKey = event.altKey;
    contact.ctrlKey = event.ctrlKey;
    contact.metaKey = event.metaKey;
    contact.shiftKey = event.shiftKey;
    contact.timestamp = event.timestamp;

    if (resetStart) {
      contact.startClientX = event.clientX;
      contact.startClientY = event.clientY;
      contact.startCanvasX = event.canvasX;
      contact.startCanvasY = event.canvasY;
    }
  }

  #writeFrameAggregate(entities: Array<ReturnType<typeof this.createEntity>>): void {
    this.frame.activePointerCount = entities.length;
    this.frame.hasMultiTouch = entities.length > 1;

    if (entities.length === 0) {
      this.frame.primaryPointerId = -1;
      this.frame.centroidClientX = 0;
      this.frame.centroidClientY = 0;
      this.frame.centroidCanvasX = 0;
      this.frame.centroidCanvasY = 0;
      this.frame.pinchDistance = 0;
      return;
    }

    let centroidClientX = 0;
    let centroidClientY = 0;
    let centroidCanvasX = 0;
    let centroidCanvasY = 0;
    let primaryPointerId = -1;

    for (const entity of entities) {
      const contact = entity.read(PointerContact);

      centroidClientX += contact.clientX;
      centroidClientY += contact.clientY;
      centroidCanvasX += contact.canvasX;
      centroidCanvasY += contact.canvasY;

      if (primaryPointerId === -1 && contact.isPrimary) {
        primaryPointerId = contact.pointerId;
      }
    }

    this.frame.primaryPointerId = primaryPointerId === -1
      ? entities[0].read(PointerContact).pointerId
      : primaryPointerId;
    this.frame.centroidClientX = centroidClientX / entities.length;
    this.frame.centroidClientY = centroidClientY / entities.length;
    this.frame.centroidCanvasX = centroidCanvasX / entities.length;
    this.frame.centroidCanvasY = centroidCanvasY / entities.length;

    if (entities.length < 2) {
      this.frame.pinchDistance = 0;
      return;
    }

    const first = entities[0].read(PointerContact);
    const second = entities[1].read(PointerContact);
    const deltaX = second.canvasX - first.canvasX;
    const deltaY = second.canvasY - first.canvasY;

    this.frame.pinchDistance = Math.hypot(deltaX, deltaY);
  }
}
