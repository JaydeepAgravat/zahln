import type { Meta, StoryObj } from '@storybook/react-vite';
import { useState } from 'react';
import {
  Badge,
  Button,
  Card,
  Dialog,
  Empty,
  Field,
  Input,
  Select,
  Spinner,
  StatusBadge,
  Switch,
  Textarea,
} from '../index';

const meta: Meta = { title: 'Primitives' };
export default meta;

export const Buttons: StoryObj = {
  render: () => (
    <div className="flex flex-wrap items-center gap-3">
      <Button variant="primary">Refund…</Button>
      <Button>Export CSV</Button>
      <Button variant="ghost">Cancel</Button>
      <Button variant="danger">Reset everything</Button>
      <Button variant="primary" busy>
        Paying
      </Button>
      <Button disabled>Disabled</Button>
      <Button size="sm">Small</Button>
    </div>
  ),
};

export const Fields: StoryObj = {
  render: () => (
    <div className="flex w-80 flex-col gap-4">
      <Field label="Amount" hint="Up to 6,30 €">
        {(id) => <Input id={id} inputMode="decimal" placeholder="6,30" />}
      </Field>
      <Field label="Reason" error="A reason is required">
        {(id) => <Textarea id={id} />}
      </Field>
      <Field label="Status">
        {(id) => (
          <Select id={id} defaultValue="paid">
            <option value="paid">Paid</option>
            <option value="refunded">Refunded</option>
          </Select>
        )}
      </Field>
    </div>
  ),
};

export const Badges: StoryObj = {
  render: () => (
    <div className="flex flex-col gap-3">
      <div className="flex flex-wrap gap-2">
        <StatusBadge status="awaiting_scan" />
        <StatusBadge status="scanned" />
        <StatusBadge status="paid" />
        <StatusBadge status="partially_refunded" />
        <StatusBadge status="refunded" />
        <StatusBadge status="expired" />
      </div>
      <div className="flex flex-wrap gap-2">
        <StatusBadge status="paid" label="Bezahlt" />
        <Badge tone="brand">Pro</Badge>
        <Badge tone="info">Config</Badge>
        <Badge tone="danger">Rail</Badge>
      </div>
    </div>
  ),
};

function SwitchDemo() {
  const [on, setOn] = useState(true);
  const [kill, setKill] = useState(false);
  return (
    <div className="flex items-center gap-6">
      <Switch label="Discreet mode by default" checked={on} onChange={setOn} />
      <Switch label="Kill Tap to Pay" danger checked={kill} onChange={setKill} />
    </div>
  );
}
export const Switches: StoryObj = { render: () => <SwitchDemo /> };

export const CardAndEmpty: StoryObj = {
  render: () => (
    <div className="w-96">
      <Card title="Recent payments" actions={<Spinner className="text-text-tertiary" />}>
        <Empty title="No payments yet">Payments appear here the moment a customer pays.</Empty>
      </Card>
    </div>
  ),
};

function DialogDemo() {
  const [open, setOpen] = useState(false);
  return (
    <>
      <Button variant="primary" onClick={() => setOpen(true)}>
        Open dialog
      </Button>
      <Dialog open={open} onClose={() => setOpen(false)} title="Publish config">
        <p className="text-callout text-text-secondary">killSwitches.nfc_pay: false → true</p>
        <div className="flex justify-end gap-2">
          <Button variant="ghost" onClick={() => setOpen(false)}>
            Cancel
          </Button>
          <Button variant="danger" onClick={() => setOpen(false)}>
            Publish now
          </Button>
        </div>
      </Dialog>
    </>
  );
}
export const DialogStory: StoryObj = { name: 'Dialog', render: () => <DialogDemo /> };
