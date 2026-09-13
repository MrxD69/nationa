<script setup lang="ts">
const props = defineProps<{
  text: string;
}>();

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function renderInline(value: string): string {
  let out = escapeHtml(value);
  out = out.replace(
    /`([^`\n]+)`/g,
    '<code class="rounded bg-accented px-1 font-mono text-[0.9em]" dir="ltr">$1</code>',
  );
  out = out.replace(/\*\*([^*]+)\*\*/g, "<strong>$1</strong>");
  out = out.replace(/(^|[^\w*])\*([^*\n]+)\*/g, "$1<em>$2</em>");
  out = out.replace(
    /\[([^\]]+)\]\((https?:\/\/[^)\s]+)\)/g,
    '<a href="$2" target="_blank" rel="noopener" class="text-primary underline underline-offset-2">$1</a>',
  );
  return out;
}

const html = computed(() => {
  const lines = props.text.split("\n");
  const blocks: string[] = [];
  let inFence = false;
  let fenceLines: string[] = [];
  let listItems: string[] = [];
  let paraLines: string[] = [];

  function flushPara() {
    if (paraLines.length > 0) {
      blocks.push(`<p dir="auto">${paraLines.map(renderInline).join("<br />")}</p>`);
      paraLines = [];
    }
  }

  function flushList() {
    if (listItems.length > 0) {
      blocks.push(
        `<ul dir="auto" class="list-disc space-y-1 ps-5">${listItems.map((item) => `<li>${renderInline(item)}</li>`).join("")}</ul>`,
      );
      listItems = [];
    }
  }

  function flushFence() {
    blocks.push(
      `<pre dir="ltr" class="overflow-x-auto rounded-lg bg-accented p-3 font-mono text-sm leading-5">${escapeHtml(fenceLines.join("\n"))}</pre>`,
    );
    fenceLines = [];
  }

  for (const line of lines) {
    if (/^\s*```/.test(line)) {
      if (inFence) {
        flushFence();
        inFence = false;
      } else {
        flushPara();
        flushList();
        inFence = true;
      }
      continue;
    }
    if (inFence) {
      fenceLines.push(line);
      continue;
    }
    const heading = line.match(/^\s*(#{1,3})\s+(.*)$/);
    if (heading) {
      flushPara();
      flushList();
      const level = heading[1].length;
      const cls =
        level === 1
          ? "text-lg font-semibold"
          : level === 2
            ? "text-base font-semibold"
            : "text-base font-medium";
      blocks.push(`<h${level} dir="auto" class="${cls}">${renderInline(heading[2])}</h${level}>`);
      continue;
    }
    const list = line.match(/^\s*[-*]\s+(.*)$/);
    if (list) {
      flushPara();
      listItems.push(list[1]);
      continue;
    }
    if (line.trim() === "") {
      flushPara();
      flushList();
      continue;
    }
    flushList();
    paraLines.push(line);
  }
  if (inFence) {
    flushFence();
  }
  flushPara();
  flushList();
  return blocks.join("");
});
</script>

<template>
  <div class="max-w-prose space-y-2 text-base leading-6 text-highlighted" v-html="html" />
</template>
