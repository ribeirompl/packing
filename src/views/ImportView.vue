<template>
  <div class="min-h-screen bg-gray-50 py-8 px-4">
    <div class="max-w-2xl mx-auto">
      <h1 class="text-3xl font-bold text-gray-900 mb-2">Shared checklist</h1>

      <!-- Loading -->
      <div v-if="state === 'loading'" class="bg-white rounded-lg shadow-md p-6 text-gray-600">
        Opening shared checklist…
      </div>

      <!-- Error -->
      <div v-else-if="state === 'error'" class="bg-white rounded-lg shadow-md p-6 space-y-4">
        <div class="bg-red-50 border-l-4 border-red-400 p-4 rounded-lg" role="alert">
          <p class="font-medium text-red-800">This link can't be opened</p>
          <p class="text-sm text-red-700 mt-1">{{ errorMessage }}</p>
        </div>
        <BaseButton variant="primary" class="w-full sm:w-auto" @click="router.push('/')">
          Plan a new trip instead
        </BaseButton>
      </div>

      <!-- Preview -->
      <template v-else-if="snapshot">
        <p class="text-gray-600 mb-6">
          Someone shared a packing checklist with you. Review it, then use it as your own.
        </p>

        <div class="bg-white rounded-lg shadow-md p-6 mb-4">
          <h2 class="text-xl font-semibold text-gray-900 break-words">
            {{ snapshot.title || 'Untitled trip' }}
          </h2>
          <p class="text-gray-600 mt-1">
            {{ formatDate(snapshot.start_date) }} – {{ formatDate(snapshot.end_date) }}
            <span class="text-gray-400">·</span>
            {{ tripDays }} {{ tripDays === 1 ? 'day' : 'days' }}
          </p>

          <div v-if="tagLabels.length" class="flex flex-wrap gap-2 mt-3">
            <span
              v-for="label in tagLabels"
              :key="label"
              class="px-2.5 py-1 rounded-full bg-indigo-50 text-indigo-700 text-xs font-medium"
            >
              {{ label }}
            </span>
          </div>

          <p class="text-sm text-gray-700 mt-4">
            <strong>{{ snapshot.items.length }}</strong>
            {{ snapshot.items.length === 1 ? 'item' : 'items' }} in
            <strong>{{ groups.length }}</strong>
            {{ groups.length === 1 ? 'category' : 'categories' }}
            <template v-if="includesPacked">
              · <strong>{{ packedCount }}</strong> already packed
            </template>
          </p>
        </div>

        <div class="bg-white rounded-lg shadow-md divide-y divide-gray-100 mb-4">
          <section v-for="group in groups" :key="group.name" class="p-4">
            <h3
              class="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-2 break-words"
            >
              {{ group.name }}
              <span class="font-normal normal-case">({{ group.items.length }})</span>
            </h3>
            <ul class="space-y-1">
              <li
                v-for="(item, index) in group.items"
                :key="index"
                class="flex items-start gap-2 text-gray-800"
              >
                <span
                  v-if="includesPacked"
                  class="mt-0.5 w-5 shrink-0 text-center"
                  :class="item.checked ? 'text-green-600' : 'text-gray-300'"
                  :aria-label="item.checked ? 'Packed' : 'Not packed'"
                  >{{ item.checked ? '✓' : '○' }}</span
                >
                <span class="flex-1 min-w-0 break-words" :class="{ 'text-gray-500': item.checked }">
                  {{ item.name }}
                  <span
                    v-if="item.phase !== 'ahead'"
                    class="ml-1 text-xs text-indigo-600 whitespace-nowrap"
                  >
                    {{ phaseLabel(item.phase) }}
                  </span>
                </span>
                <span v-if="item.quantity > 1" class="text-sm text-gray-500 shrink-0">
                  ×{{ item.quantity }}
                </span>
              </li>
            </ul>
          </section>
        </div>

        <div class="bg-white rounded-lg shadow-md p-6 space-y-4">
          <BaseCheckbox
            id="import-add-to-library"
            v-model="addToLibrary"
            label="Also add new items to my item library"
            description="Items you don't have yet will be saved so future checklists can include them"
          />

          <p v-if="importError" class="text-sm text-red-600" role="alert">{{ importError }}</p>

          <div class="flex flex-col-reverse sm:flex-row sm:justify-end gap-3">
            <BaseButton variant="outline" :disabled="importing" @click="router.push('/')">
              Cancel
            </BaseButton>
            <BaseButton variant="primary" :disabled="importing" @click="onUseChecklist">
              {{ importing ? 'Importing…' : 'Use this checklist' }}
            </BaseButton>
          </div>
        </div>
      </template>
    </div>

    <BaseModal
      :is-open="confirmOpen"
      title="Replace your current checklist?"
      @close="confirmOpen = false"
    >
      <p class="text-sm text-gray-600">
        You already have a checklist<template v-if="existingTitle">
          (<strong class="text-gray-800">{{ existingTitle }}</strong
          >)</template
        >. Using the shared checklist will replace it, including your packing progress. This can't
        be undone.
      </p>
      <template #footer>
        <BaseButton variant="outline" @click="confirmOpen = false">Keep mine</BaseButton>
        <BaseButton variant="danger" @click="doImport">Replace</BaseButton>
      </template>
    </BaseModal>
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, ref, shallowRef } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { differenceInCalendarDays, format, parseISO } from 'date-fns';
import BaseButton from '@/components/common/BaseButton.vue';
import BaseCheckbox from '@/components/common/BaseCheckbox.vue';
import BaseModal from '@/components/common/BaseModal.vue';
import { useChecklist } from '@/composables/useChecklist';
import { useToast } from '@/composables/useToast';
import { decodeSnapshot } from '@/services/ShareService';
import { PACK_PHASE_LABELS, TRIP_TAG_LABELS } from '@/types';
import type { ChecklistSnapshot, PackPhase } from '@/types';

type Item = ChecklistSnapshot['items'][number];

const route = useRoute();
const router = useRouter();
const { getCurrentChecklist, importChecklist } = useChecklist();
const { showSuccess } = useToast();

const state = ref<'loading' | 'ready' | 'error'>('loading');
const errorMessage = ref('');
// shallowRef keeps the snapshot a plain object: IndexedDB can't store reactive proxies
const snapshot = shallowRef<ChecklistSnapshot | null>(null);
const addToLibrary = ref(false);
const importing = ref(false);
const importError = ref('');
const confirmOpen = ref(false);
const existingTitle = ref('');

const tagLabels = computed(() => snapshot.value?.tags.map((tag) => TRIP_TAG_LABELS[tag]) ?? []);
const includesPacked = computed(
  () => snapshot.value?.items.some((item) => item.checked !== undefined) ?? false
);
const packedCount = computed(() => snapshot.value?.items.filter((i) => i.checked).length ?? 0);
const tripDays = computed(() =>
  snapshot.value
    ? differenceInCalendarDays(
        parseISO(snapshot.value.end_date),
        parseISO(snapshot.value.start_date)
      ) + 1
    : 0
);

// Categories in the order they first appear, matching the sharer's list
const groups = computed(() => {
  const map = new Map<string, Item[]>();
  for (const item of snapshot.value?.items ?? []) {
    const list = map.get(item.category_name) ?? [];
    list.push(item);
    map.set(item.category_name, list);
  }
  return [...map].map(([name, items]) => ({ name, items }));
});

function formatDate(date: string): string {
  // parseISO treats 'yyyy-MM-dd' as local time; new Date() would parse it as UTC
  return format(parseISO(date), 'MMM d, yyyy');
}

function phaseLabel(phase: PackPhase): string {
  return phase === 'last_minute' ? 'Last-minute' : PACK_PHASE_LABELS[phase];
}

onMounted(async () => {
  const raw = route.query.d;
  const data = Array.isArray(raw) ? raw[0] : raw;
  if (!data) {
    errorMessage.value =
      "This link doesn't include a checklist. Make sure you copied the whole link.";
    state.value = 'error';
    return;
  }

  const result = await decodeSnapshot(data);
  if (!result.success) {
    errorMessage.value = result.error.message;
    state.value = 'error';
    return;
  }
  snapshot.value = result.data;
  state.value = 'ready';
});

async function onUseChecklist() {
  importError.value = '';
  const current = await getCurrentChecklist();
  if (current.success && current.data) {
    existingTitle.value = current.data.checklist.title;
    confirmOpen.value = true;
    return;
  }
  await doImport();
}

async function doImport() {
  if (!snapshot.value) return;
  confirmOpen.value = false;
  importing.value = true;
  try {
    const result = await importChecklist(snapshot.value, { addToLibrary: addToLibrary.value });
    if (!result.success) {
      importError.value = 'Could not import the checklist. Please try again.';
      return;
    }
    showSuccess('Shared checklist imported');
    await router.replace('/checklist');
  } finally {
    importing.value = false;
  }
}
</script>
