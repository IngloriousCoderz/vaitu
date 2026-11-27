-- Jobs written straight to the API hold only what the form allows: a job type
-- that exists, and the details its setting and profession have, with values
-- from their lists. The taxonomy is a copy of
-- supabase/functions/_shared/job-taxonomy.json: `pnpm taxonomy:snippet`
-- rewrites it and writes the snippet that updates production.
create table public.job_taxonomy (
  id boolean primary key default true check (id),
  taxonomy jsonb not null
);

alter table public.job_taxonomy enable row level security;

insert into public.job_taxonomy (id, taxonomy)
values (true, $taxonomy$
{
  "settingsByProfession": {
    "photographer": [
      "wedding",
      "festival",
      "concert"
    ],
    "videographer": [
      "wedding",
      "festival",
      "concert"
    ],
    "musician": [
      "wedding",
      "festival",
      "concert"
    ],
    "dj": [
      "wedding",
      "festival"
    ],
    "sound_technician": [
      "festival",
      "concert"
    ],
    "planner": [
      "wedding"
    ],
    "makeup_artist": [
      "wedding"
    ],
    "cleaner": [
      "apartment",
      "house",
      "office"
    ],
    "electrician": [
      "apartment",
      "house",
      "office"
    ]
  },
  "settings": {
    "wedding": {
      "textFields": [
        "spouse_first_name_1",
        "spouse_first_name_2"
      ],
      "isTitled": false,
      "isHome": false,
      "details": {
        "styles": [
          "photographer",
          "videographer"
        ],
        "moments": [
          "musician",
          "dj"
        ],
        "genres": [
          "musician",
          "dj"
        ]
      }
    },
    "festival": {
      "textFields": [
        "headliner"
      ],
      "isTitled": true,
      "isHome": false,
      "details": {
        "genres": null
      }
    },
    "concert": {
      "textFields": [
        "headliner"
      ],
      "isTitled": true,
      "isHome": false,
      "details": {
        "genres": null
      }
    },
    "apartment": {
      "textFields": [],
      "isTitled": true,
      "isHome": true,
      "details": {}
    },
    "house": {
      "textFields": [],
      "isTitled": true,
      "isHome": true,
      "details": {}
    },
    "office": {
      "textFields": [],
      "isTitled": true,
      "isHome": true,
      "details": {}
    }
  },
  "options": {
    "styles": [
      {
        "value": "editorial",
        "labels": {
          "en": "Editorial",
          "it": "Editoriale",
          "fr": "Éditorial",
          "ar": "تحريري",
          "ja": "エディトリアル"
        }
      },
      {
        "value": "documentary",
        "labels": {
          "en": "Documentary",
          "it": "Documentaristico",
          "fr": "Documentaire",
          "ar": "وثائقي",
          "ja": "ドキュメンタリー"
        }
      },
      {
        "value": "reportage",
        "labels": {
          "en": "Reportage",
          "it": "Reportage",
          "fr": "Reportage",
          "ar": "ريبورتاج",
          "ja": "ルポルタージュ"
        }
      },
      {
        "value": "classic",
        "labels": {
          "en": "Classic",
          "it": "Classico",
          "fr": "Classique",
          "ar": "كلاسيكي",
          "ja": "クラシック"
        }
      },
      {
        "value": "film",
        "labels": {
          "en": "Film",
          "it": "Pellicola",
          "fr": "Argentique",
          "ar": "فيلم",
          "ja": "フィルム"
        }
      },
      {
        "value": "fine_art",
        "labels": {
          "en": "Fine Art",
          "it": "Fine Art",
          "fr": "Fine art",
          "ar": "فن تشكيلي",
          "ja": "ファインアート"
        }
      }
    ],
    "moments": [
      {
        "value": "ceremony",
        "labels": {
          "en": "Ceremony",
          "it": "Cerimonia",
          "fr": "Cérémonie",
          "ar": "المراسم",
          "ja": "挙式"
        }
      },
      {
        "value": "aperitivo",
        "labels": {
          "en": "Aperitivo",
          "it": "Aperitivo",
          "fr": "Vin d'honneur",
          "ar": "المقبلات",
          "ja": "アペリティーボ"
        }
      },
      {
        "value": "dinner",
        "labels": {
          "en": "Dinner",
          "it": "Cena",
          "fr": "Dîner",
          "ar": "العشاء",
          "ja": "ディナー"
        }
      },
      {
        "value": "party",
        "labels": {
          "en": "Party",
          "it": "Festa",
          "fr": "Soirée dansante",
          "ar": "الحفلة",
          "ja": "パーティー"
        }
      }
    ],
    "genres": [
      {
        "value": "house",
        "labels": {
          "en": "House",
          "it": "House",
          "fr": "House",
          "ar": "هاوس",
          "ja": "ハウス"
        }
      },
      {
        "value": "techno",
        "labels": {
          "en": "Techno",
          "it": "Techno",
          "fr": "Techno",
          "ar": "تكنو",
          "ja": "テクノ"
        }
      },
      {
        "value": "indie",
        "labels": {
          "en": "Indie",
          "it": "Indie",
          "fr": "Indie",
          "ar": "إندي",
          "ja": "インディー"
        }
      },
      {
        "value": "jazz",
        "labels": {
          "en": "Jazz",
          "it": "Jazz",
          "fr": "Jazz",
          "ar": "جاز",
          "ja": "ジャズ"
        }
      },
      {
        "value": "electronic",
        "labels": {
          "en": "Electronic",
          "it": "Elettronica",
          "fr": "Électronique",
          "ar": "إلكتروني",
          "ja": "エレクトロニック"
        }
      },
      {
        "value": "rock",
        "labels": {
          "en": "Rock",
          "it": "Rock",
          "fr": "Rock",
          "ar": "روك",
          "ja": "ロック"
        }
      },
      {
        "value": "pop",
        "labels": {
          "en": "Pop",
          "it": "Pop",
          "fr": "Pop",
          "ar": "بوب",
          "ja": "ポップ"
        }
      },
      {
        "value": "classical",
        "labels": {
          "en": "Classical",
          "it": "Classica",
          "fr": "Classique",
          "ar": "كلاسيكية",
          "ja": "クラシック"
        }
      },
      {
        "value": "acoustic",
        "labels": {
          "en": "Acoustic",
          "it": "Acustica",
          "fr": "Acoustique",
          "ar": "أكوستيك",
          "ja": "アコースティック"
        }
      },
      {
        "value": "swing",
        "labels": {
          "en": "Swing",
          "it": "Swing",
          "fr": "Swing",
          "ar": "سوينغ",
          "ja": "スウィング"
        }
      },
      {
        "value": "soul_funk",
        "labels": {
          "en": "Soul & funk",
          "it": "Soul e funk",
          "fr": "Soul et funk",
          "ar": "سول وفانك",
          "ja": "ソウル・ファンク"
        }
      },
      {
        "value": "latin",
        "labels": {
          "en": "Latin",
          "it": "Latina",
          "fr": "Latino",
          "ar": "لاتيني",
          "ja": "ラテン"
        }
      },
      {
        "value": "italian",
        "labels": {
          "en": "Italian",
          "it": "Italiana",
          "fr": "Italienne",
          "ar": "إيطالي",
          "ja": "イタリアン"
        }
      },
      {
        "value": "country",
        "labels": {
          "en": "Country",
          "it": "Country",
          "fr": "Country",
          "ar": "كانتري",
          "ja": "カントリー"
        }
      }
    ]
  }
}
$taxonomy$)
on conflict (id) do update set taxonomy = excluded.taxonomy;

create or replace function public.vaitu_check_job_details()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_taxonomy jsonb;
  v_setting jsonb;
  v_field text;
  v_value jsonb;
  v_professions jsonb;
begin
  select taxonomy into v_taxonomy from public.job_taxonomy;

  if not coalesce(
    (v_taxonomy -> 'settingsByProfession' -> new.profession) ? new.setting,
    false
  ) then
    raise exception 'Unknown job type: % %', new.setting, new.profession
      using errcode = 'check_violation';
  end if;

  if jsonb_typeof(new.details) <> 'object' then
    raise exception 'Job details must be an object'
      using errcode = 'check_violation';
  end if;

  v_setting := v_taxonomy -> 'settings' -> new.setting;

  for v_field, v_value in select key, value from jsonb_each(new.details) loop
    if (v_setting -> 'textFields') ? v_field then
      if jsonb_typeof(v_value) not in ('string', 'null') then
        raise exception 'Job detail % must be text', v_field
          using errcode = 'check_violation';
      end if;
      continue;
    end if;

    if not (v_setting -> 'details') ? v_field then
      raise exception 'A % job has no detail %', new.setting, v_field
        using errcode = 'check_violation';
    end if;

    if jsonb_typeof(v_value) <> 'array' then
      raise exception 'Job detail % must be a list', v_field
        using errcode = 'check_violation';
    end if;

    v_professions := v_setting -> 'details' -> v_field;
    if jsonb_typeof(v_professions) = 'array'
      and not v_professions ? new.profession
      and jsonb_array_length(v_value) > 0
    then
      raise exception 'A % % job has no detail %',
        new.setting, new.profession, v_field
        using errcode = 'check_violation';
    end if;

    if exists (
      select 1
      from jsonb_array_elements(v_value) picked
      where not exists (
        select 1
        from jsonb_array_elements(v_taxonomy -> 'options' -> v_field) option
        where option -> 'value' = picked
      )
    ) then
      raise exception 'Job detail % has a value not on its list', v_field
        using errcode = 'check_violation';
    end if;
  end loop;

  return new;
end;
$$;

create trigger trg_job_details_check
  before insert or update of setting, profession, details
  on public.jobs
  for each row
  execute function public.vaitu_check_job_details();
