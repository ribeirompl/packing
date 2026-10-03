<template>
  <button
    v-bind="$attrs"
    type="button"
    class="inline-flex items-center gap-2 min-h-[44px] px-4 py-2 rounded-lg font-medium text-blue-600 hover:text-blue-700 hover:bg-blue-50 transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500"
    @click="open"
  >
    <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
      <path
        stroke-linecap="round"
        stroke-linejoin="round"
        stroke-width="2"
        d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.368 2.684 3 3 0 00-5.368-2.684z"
      />
    </svg>
    Share
  </button>

  <BaseModal :is-open="isOpen" title="Share checklist" @close="close">
    <div class="space-y-4">
      <p class="text-sm text-gray-600">
        Anyone with the link can open a copy of this checklist in their own app. The link contains
        the full list, including items you added yourself. Nothing is uploaded.
      </p>

      <BaseCheckbox
        id="share-include-packed"
        v-model="includeChecked"
        label="Include packed status"
        description="Items you've already packed will show as packed for them too"
        @update:model-value="manualUrl = ''"
      />

      <div v-if="manualUrl" class="space-y-1">
        <label for="share-url" class="block text-sm font-medium text-gray-700">
          Copy this link:
        </label>
        <input
          id="share-url"
          ref="urlInput"
          :value="manualUrl"
          readonly
          class="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm text-gray-700 bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500"
          @focus="selectUrl"
          @click="selectUrl"
        />
      </div>

      <p v-if="errorMessage" class="text-sm text-red-600" role="alert">{{ errorMessage }}</p>
    </div>

    <template #footer>
      <BaseButton variant="outline" @click="close">Close</BaseButton>
      <BaseButton
        :variant="canNativeShare ? 'secondary' : 'primary'"
        :disabled="busy"
        @click="copyLink"
      >
        Copy link
      </BaseButton>
      <BaseButton v-if="canNativeShare" variant="primary" :disabled="busy" @click="nativeShare">
        Share…
      </BaseButton>
    </template>
  </BaseModal>
</template>

<script setup lang="ts">
import { nextTick, ref } from 'vue';
import BaseModal from '@/components/common/BaseModal.vue';
import BaseButton from '@/components/common/BaseButton.vue';
import BaseCheckbox from '@/components/common/BaseCheckbox.vue';
import { ChecklistService } from '@/services/ChecklistService';
import { buildShareUrl } from '@/services/ShareService';
import { useToast } from '@/composables/useToast';

// Root is a fragment (button + teleported dialog); pass attributes like class to the button
defineOptions({ inheritAttrs: false });

const checklistService = new ChecklistService();
const { showSuccess } = useToast();

const isOpen = ref(false);
const includeChecked = ref(false);
const busy = ref(false);
const errorMessage = ref('');
const manualUrl = ref('');
const urlInput = ref<HTMLInputElement | null>(null);
const canNativeShare = typeof navigator !== 'undefined' && typeof navigator.share === 'function';

function open() {
  includeChecked.value = false;
  errorMessage.value = '';
  manualUrl.value = '';
  isOpen.value = true;
}

function close() {
  isOpen.value = false;
}

async function createLink(): Promise<{ title: string; url: string } | null> {
  errorMessage.value = '';
  const result = await checklistService.getSnapshot(includeChecked.value);
  if (!result.success) {
    errorMessage.value = 'Could not read your checklist. Please try again.';
    return null;
  }
  if (!result.data) {
    errorMessage.value = 'There is no checklist to share yet.';
    return null;
  }
  try {
    return { title: result.data.title, url: await buildShareUrl(result.data) };
  } catch (error) {
    errorMessage.value = error instanceof Error ? error.message : 'Could not create a link.';
    return null;
  }
}

async function showManualUrl(url: string) {
  manualUrl.value = url;
  await nextTick();
  selectUrl();
}

function selectUrl() {
  urlInput.value?.focus();
  urlInput.value?.select();
}

async function copyLink() {
  busy.value = true;
  try {
    const link = await createLink();
    if (!link) return;
    try {
      await navigator.clipboard.writeText(link.url);
      close();
      showSuccess('Link copied to clipboard');
    } catch {
      // Clipboard can be unavailable (insecure context, permissions); let them copy by hand
      await showManualUrl(link.url);
    }
  } finally {
    busy.value = false;
  }
}

async function nativeShare() {
  busy.value = true;
  try {
    const link = await createLink();
    if (!link) return;
    try {
      await navigator.share({ title: link.title, url: link.url });
      close();
      showSuccess('Checklist link shared');
    } catch (error) {
      // The user dismissed the share sheet: leave the dialog open, no message
      if (error instanceof DOMException && error.name === 'AbortError') return;
      await showManualUrl(link.url);
    }
  } finally {
    busy.value = false;
  }
}
</script>
