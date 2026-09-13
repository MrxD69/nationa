<script setup lang="ts">
import type { FormFieldLabel } from "@nationa/api/domain/procedure-forms";

type RenderField = {
  key: string;
  type: string;
  required: boolean;
  options?: string[];
  label?: FormFieldLabel;
};

type AddressParts = {
  street?: string;
  building?: string;
  office?: string;
  locality?: string;
  postalCode?: string;
  city?: string;
  governorate?: string;
  country?: string;
};

type AddressValue = {
  fr?: AddressParts;
  ar?: AddressParts;
  raw?: string;
};

const props = defineProps<{
  field: RenderField;
  modelValue: unknown;
}>();

const emit = defineEmits<{ (event: "update:modelValue", value: unknown): void }>();

const stringValue = computed(() =>
  props.modelValue === null || props.modelValue === undefined ? "" : String(props.modelValue),
);

const booleanValue = computed(() => {
  const value = props.modelValue;
  if (typeof value === "boolean") {
    return value;
  }
  if (typeof value === "string") {
    const normalized = value.trim().toLowerCase();
    return ["true", "1", "oui", "yes", "نعم"].includes(normalized);
  }
  return Boolean(value);
});

const selectItems = computed(() =>
  (props.field.options ?? []).map((option) => ({ label: option, value: option })),
);

const address = computed<AddressValue>(() => {
  const value = props.modelValue;
  if (value && typeof value === "object" && !Array.isArray(value)) {
    return value as AddressValue;
  }
  if (typeof value === "string") {
    return { raw: value };
  }
  return {};
});

const ADDRESS_PARTS: Array<{ key: keyof AddressParts; label: string }> = [
  { key: "street", label: "street" },
  { key: "city", label: "city" },
  { key: "postalCode", label: "postalCode" },
  { key: "governorate", label: "governorate" },
];

const ADDRESS_LOCALES = ["fr", "ar"] as const;

function setAddressPart(part: "fr" | "ar", key: keyof AddressParts, value: string): void {
  const next: AddressValue = {
    ...address.value,
    [part]: { ...address.value[part], [key]: value },
  };
  emit("update:modelValue", next);
}

function addressPartHandler(part: "fr" | "ar", key: keyof AddressParts) {
  return (value: string) => setAddressPart(part, key, value);
}

function setAddressRaw(value: string): void {
  emit("update:modelValue", { ...address.value, raw: value });
}

function onNumber(value: string | number): void {
  emit("update:modelValue", value === "" ? null : Number(value));
}
</script>

<template>
  <div class="grid gap-2">
    <template v-if="props.field.type === 'textarea'">
      <UTextarea
        :model-value="stringValue"
        :required="props.field.required"
        class="w-full"
        @update:model-value="emit('update:modelValue', $event)"
      />
    </template>

    <template v-else-if="props.field.type === 'number'">
      <UInput
        type="number"
        :model-value="stringValue"
        :required="props.field.required"
        class="w-full"
        @update:model-value="onNumber"
      />
    </template>

    <template v-else-if="props.field.type === 'currency'">
      <UInput
        type="number"
        step="0.001"
        :model-value="stringValue"
        :required="props.field.required"
        class="w-full"
        :ui="{ trailing: 'pe-1' }"
        @update:model-value="onNumber"
      >
        <template #trailing>
          <span class="text-sm text-muted">TND</span>
        </template>
      </UInput>
    </template>

    <template v-else-if="props.field.type === 'date'">
      <UInput
        type="date"
        :model-value="stringValue"
        :required="props.field.required"
        class="w-full"
        @update:model-value="emit('update:modelValue', $event)"
      />
    </template>

    <template v-else-if="props.field.type === 'checkbox'">
      <UCheckbox
        :model-value="booleanValue"
        @update:model-value="emit('update:modelValue', $event)"
      />
    </template>

    <template v-else-if="props.field.type === 'select'">
      <USelect
        :model-value="stringValue"
        :items="selectItems"
        :required="props.field.required"
        class="w-full"
        @update:model-value="emit('update:modelValue', $event)"
      />
    </template>

    <template v-else-if="props.field.type === 'radio'">
      <URadioGroup
        :model-value="stringValue"
        :items="selectItems"
        @update:model-value="emit('update:modelValue', $event)"
      />
    </template>

    <template v-else-if="props.field.type === 'address'">
      <div class="grid gap-3">
        <div v-for="part in ADDRESS_LOCALES" :key="part" class="grid gap-2">
          <div class="text-sm font-medium text-muted">{{ part.toUpperCase() }}</div>
          <div class="grid gap-2 sm:grid-cols-2">
            <UInput
              v-for="partField in ADDRESS_PARTS"
              :key="`${part}-${partField.key}`"
              :model-value="address[part]?.[partField.key] ?? ''"
              :placeholder="String(partField.key)"
              @update:model-value="addressPartHandler(part, partField.key)"
            />
          </div>
        </div>
        <UTextarea
          :model-value="address.raw ?? ''"
          :placeholder="'raw'"
          :rows="2"
          @update:model-value="setAddressRaw"
        />
      </div>
    </template>

    <template v-else>
      <UInput
        :model-value="stringValue"
        :required="props.field.required"
        class="w-full"
        @update:model-value="emit('update:modelValue', $event)"
      />
    </template>
  </div>
</template>
