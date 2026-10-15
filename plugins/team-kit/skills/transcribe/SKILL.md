---
name: transcribe
description: Transcribe a voice memo, call recording or any audio/video file to text, locally and offline. Use whenever the user sends an audio file (.m4a, .mp3, .wav, .ogg, .opus) or a video and wants the words out of it, or says "transcribe this", "what does this say", or drops a voice memo.
---

# Transcribe audio locally

Whisper via `uvx`, on the CPU, offline after the first run. Nothing is uploaded
anywhere. Verified working 2026-08-10: a 5-second clip transcribed word-perfect
in 3.5 seconds.

## The command

```bash
PYTHONUTF8=1 uvx --from whisper-ctranslate2 whisper-ctranslate2 "<file>" \
  --model small.en --device cpu --compute_type int8 \
  --output_format txt --output_dir "<dir>"
```

Writes `<basename>.txt` next to wherever `--output_dir` points. Read that file.

## Three things that will bite you

1. **`--device cpu` is not optional.** Without it faster-whisper tries CUDA and
   dies with `Library cublas64_12.dll is not found`. Most laptops have no CUDA
   runtime. The failure happens AFTER it downloads the model and prints
   "Detected language", so it looks like it nearly worked.
2. **`PYTHONUTF8=1` or `--help` crashes.** argparse cannot print its help text
   to the default Windows console encoding. Harmless for real runs, confusing
   when you are trying to check the flags.
3. **First run downloads the model** (~460MB for `small.en`) into the HF cache.
   After that it is offline and instant. Do not promise a fast turnaround on a
   machine that has not run it before.

## Choosing a model

`small.en` is the default choice and was accurate on clear speech. Go up only
if the audio is poor:

| Model | Size | When |
|---|---|---|
| `base.en` | ~140MB | quick and dirty, clear audio |
| `small.en` | ~460MB | **default** |
| `medium.en` | ~1.5GB | noisy recording, heavy accent, crosstalk |

Drop the `.en` suffix for non-English audio and add `--language <code>`.

## Notes

- Any format ffmpeg reads works, including `.m4a` straight off an iPhone and
  the audio track of a video file.
- Long files: it streams, so a 30-minute memo is fine, just slower. Roughly
  real-time-over-ten on a typical laptop CPU.
- `--output_format` also accepts `srt`, `vtt` and `json` if timestamps matter.
  Plain `txt` is right for a memo you are going to act on.
- Ask before transcribing anything that is obviously a private third-party
  recording rather than the user's own memo.
